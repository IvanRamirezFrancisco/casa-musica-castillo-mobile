import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, catchError, defer, firstValueFrom, from, map, of, switchMap } from 'rxjs';
import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  RegisterInput,
  TwoFactorChallenge,
  TwoFactorVerification,
} from '../models/auth.model';
import { AUTH_REPOSITORY } from '../repositories/auth.repository';
import { SESSION_STORE } from '../security/session-store.token';
import { SessionStorageError } from '../infrastructure/native-session.store';

/** Margen para no enviar un token a punto de vencer. */
const EXPIRY_SKEW_MS = 5_000;

export type LoginResult =
  | { readonly kind: 'authenticated'; readonly user: AuthUser }
  | { readonly kind: 'two-factor'; readonly challenge: TwoFactorChallenge };

/**
 * Casos de uso de autenticación y propietario único del estado de sesión (Singleton por DI).
 * Los componentes reciben `AuthUser`, nunca el JWT. Observer: `sessionEnded$` notifica a los servicios
 * con datos por usuario (carrito, pedidos, perfil) para que descarten su estado.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly repository = inject(AUTH_REPOSITORY);
  private readonly store = inject(SESSION_STORE);
  private readonly router = inject(Router);

  private readonly current = signal<AuthSession | null>(null);
  private readonly expired = signal(false);
  private readonly ended = new Subject<void>();
  private restoration: Promise<void> | null = null;
  private redirecting = false;
  private revision = 0;
  private attempt = 0;
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly storageFailed = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => { clearTimeout(this.expiryTimer); });
  }

  /** Opaque identity for rejecting late responses from a previous session. */
  get sessionVersion(): number { return this.revision; }
  readonly storageFailure = this.storageFailed.asReadonly();

  readonly user = computed(() => this.current()?.user ?? null);
  /** Hubo una sesión que terminó por expiración o 401; la pantalla de inicio debe informarlo. */
  readonly sessionExpired = this.expired.asReadonly();
  /** `false`: la sesión sólo vive en memoria y se pierde al cerrar la aplicación. */
  readonly persistent = this.store.persistent;
  readonly sessionEnded$ = this.ended.asObservable();

  hasValidSession(now = Date.now()): boolean {
    const session = this.current();
    return session !== null && (session.expiresAt !== null && session.expiresAt - EXPIRY_SKEW_MS > now);
  }

  /** JWT vigente o `null`. Solo para el interceptor HTTP. */
  validToken(now = Date.now()): string | null {
    return this.hasValidSession(now) ? (this.current()?.token ?? null) : null;
  }

  /** Restaura la sesión del almacén (una sola vez). Sin persistencia nativa solo existe memoria. */
  restore(): Promise<void> {
    if (this.hasValidSession()) return Promise.resolve();
    const revision = this.revision;
    this.restoration ??= (async () => {
      try {
        const stored = await this.store.load();
        if (!stored || revision !== this.revision || this.current() !== null) return;
        if (stored.expiresAt === null || stored.expiresAt - EXPIRY_SKEW_MS <= Date.now()) {
          this.endSession(true);
          return;
        }
        // Native persistence does not prove that the server still accepts the token or its roles.
        const user = this.store.persistent ? await firstValueFrom(this.repository.restoreUser(stored.token)) : stored.user;
        if (revision !== this.revision) return;
        if (user.id !== stored.user.id) throw new SessionStorageError();
        this.current.set({ ...stored, user });
        this.armExpiry();
      } catch (error) {
        if (revision !== this.revision) return;
        if (typeof error === 'object' && error !== null && 'status' in error
            && typeof error.status === 'number' && (error.status === 0 || error.status === 429 || error.status >= 500)) {
          // Retain encrypted state without exposing it. The next attempt must still revalidate /me.
          this.restoration = null;
          return;
        }
        if (error instanceof SessionStorageError) {
          if (error.reason === 'expired') this.expired.set(true);
          else this.storageFailed.set(true);
        }
        if (typeof error === 'object' && error !== null && 'status' in error && error.status === 401) this.expired.set(true);
        await this.safeClear();
      }
    })();
    return this.restoration;
  }

  login(credentials: LoginCredentials): Observable<LoginResult> {
    return defer(() => {
      const attempt = ++this.attempt;
      return this.repository.login(credentials).pipe(switchMap((outcome): Observable<LoginResult> => {
        if (attempt !== this.attempt) throw new SessionStorageError();
        if (outcome.kind === 'two-factor') {
          if (this.current()) this.endSession(false);
          return of(outcome);
        }
        return this.establish(outcome.session).pipe(map(() => ({ kind: 'authenticated', user: outcome.session.user })));
      }));
    });
  }

  sendTwoFactorEmailCode(challenge: TwoFactorChallenge): Observable<void> {
    return this.repository.sendTwoFactorEmailCode(challenge);
  }

  completeTwoFactor(verification: TwoFactorVerification): Observable<AuthUser> {
    return defer(() => {
      const attempt = ++this.attempt;
      return this.repository.verifyTwoFactor(verification).pipe(switchMap((session) => {
        if (attempt !== this.attempt) throw new SessionStorageError();
        return this.establish(session).pipe(map(() => session.user));
      }));
    });
  }

  register(input: RegisterInput): Observable<void> { return this.repository.register(input); }
  resendVerification(email: string): Observable<void> { return this.repository.resendVerification(email); }
  verifyEmail(token: string): Observable<void> { return this.repository.verifyEmail(token); }
  requestPasswordReset(email: string): Observable<void> { return this.repository.requestPasswordReset(email); }
  confirmPasswordReset(token: string, newPassword: string): Observable<void> {
    return this.repository.confirmPasswordReset(token, newPassword);
  }

  /**
   * Cierra la sesión local siempre. Emite `remoteRevoked=false` si el servidor no pudo revocar el JWT
   * (sin red, 401...), para informarlo sin fingir que el token quedó invalidado.
   */
  logout(): Observable<{ readonly remoteRevoked: boolean }> {
    return defer(() => {
      const token = this.validToken();
      const clearing = this.endSession(false);
      const remote$ = token !== null
        ? this.repository.logout(token).pipe(map(() => true), catchError(() => of(false)))
        : of(false);
      return remote$.pipe(switchMap((remoteRevoked) => this.store.persistent
        ? from(clearing).pipe(map(() => ({ remoteRevoked })))
        : of({ remoteRevoked })));
    });
  }

  /** HTTP 401 o token vencido: limpia credenciales y vuelve a Iniciar sesión. 403 no pasa por aquí. */
  handleUnauthorized(navigate = true): void {
    this.endSession(true);
    if (navigate && !this.redirecting && !this.router.url.startsWith('/login')) {
      this.redirecting = true;
      void this.router.navigate(['/login'], { replaceUrl: true }).catch(() => false).finally(() => { this.redirecting = false; });
    }
  }

  acknowledgeExpiry(): void {
    this.expired.set(false);
  }

  private establish(session: AuthSession): Observable<void> {
    const previous = this.current();
    const revision = ++this.revision;
    clearTimeout(this.expiryTimer);
    if (previous && previous.user.id !== session.user.id) this.ended.next();
    const accept = (): void => {
      if (revision !== this.revision) throw new SessionStorageError();
      this.current.set(session);
      this.expired.set(false);
      this.storageFailed.set(false);
      this.armExpiry();
    };
    if (!this.store.persistent) {
      accept();
      void this.store.save(session).catch(() => undefined);
      return of(undefined);
    }
    this.current.set(null);
    // Reauthentication suspends the previous native session even when the identity is unchanged.
    if (previous && previous.user.id === session.user.id) this.ended.next();
    return from((async () => {
      try { await this.store.save(session); accept(); }
      catch (error) {
        if (revision === this.revision) {
          const expired = error instanceof SessionStorageError && error.reason === 'expired';
          this.storageFailed.set(!expired);
          this.endSession(expired);
        }
        throw error instanceof SessionStorageError ? error : new SessionStorageError();
      }
    })());
  }

  private armExpiry(): void {
    clearTimeout(this.expiryTimer);
    const expiresAt = this.current()?.expiresAt;
    if (expiresAt === null || expiresAt === undefined) return;
    const revision = this.revision;
    this.expiryTimer = setTimeout(() => {
      if (revision !== this.revision) return;
      if (!this.hasValidSession()) this.handleUnauthorized();
      else this.armExpiry();
    }, Math.max(0, Math.min(expiresAt - Date.now() - EXPIRY_SKEW_MS, 2_147_483_647)));
  }

  private endSession(expiredNotice: boolean): Promise<void> {
    ++this.revision;
    ++this.attempt;
    clearTimeout(this.expiryTimer);
    const had = this.current() !== null;
    this.current.set(null);
    this.expired.set(expiredNotice);
    const clearing = this.safeClear();
    if (had) this.ended.next();
    return clearing;
  }

  private async safeClear(): Promise<void> {
    try { await this.store.clear(); }
    catch { this.storageFailed.set(true); }
  }
}
