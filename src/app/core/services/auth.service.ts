import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, catchError, defer, firstValueFrom, from, map, of, switchMap } from 'rxjs';
import type {
  AuthSession,
  AuthUser,
  CompleteGoogleRegistrationInput,
  LoginCredentials,
  PendingGoogleRegistration,
  RegisterInput,
  TwoFactorChallenge,
  TwoFactorVerification,
} from '../models/auth.model';
import { AUTH_REPOSITORY } from '../repositories/auth.repository';
import { SESSION_STORE } from '../security/session-store.token';
import { WEB_COOKIE_REFRESH_ENABLED } from '../security/web-cookie-refresh.token';
import { SessionStorageError } from '../infrastructure/native-session.store';
import { GoogleIdentityService } from './google-identity.service';

/** Margen para no enviar un token a punto de vencer. */
const EXPIRY_SKEW_MS = 5_000;

export type LoginResult =
  | { readonly kind: 'authenticated'; readonly user: AuthUser }
  | { readonly kind: 'two-factor'; readonly challenge: TwoFactorChallenge };

export type GoogleLoginResult =
  | LoginResult
  | { readonly kind: 'registration-required'; readonly pending: PendingGoogleRegistration };

/**
 * Casos de uso de autenticación y propietario único del estado de sesión (Singleton por DI).
 * Los componentes reciben `AuthUser`, nunca el JWT. Observer: `sessionEnded$` notifica a los servicios
 * con datos por usuario (carrito, pedidos, perfil) para que descarten su estado.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly repository = inject(AUTH_REPOSITORY);
  private readonly store = inject(SESSION_STORE);
  private readonly webCookieRefresh = inject(WEB_COOKIE_REFRESH_ENABLED);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private readonly router = inject(Router);

  private readonly current = signal<AuthSession | null>(null);
  private readonly expired = signal(false);
  private readonly ended = new Subject<void>();
  private restoration: Promise<void> | null = null;
  private activeRefresh: Promise<boolean> | null = null;
  private redirecting = false;
  private revision = 0;
  private sessionEpoch = 0;
  private attempt = 0;
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly storageFailed = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => { clearTimeout(this.expiryTimer); });
  }

  /** Opaque identity for rejecting late responses from a previous session. */
  get sessionVersion(): number { return this.sessionEpoch; }
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

  /** Indica si la sesión actual o el entorno web conectado disponen de mecanismo de renovación. */
  canRefresh(): boolean {
    return Boolean(this.current()?.refreshToken) || this.webCookieRefresh;
  }

  /** JWT vigente o `null`. Solo para el interceptor HTTP. */
  validToken(now = Date.now()): string | null {
    return this.hasValidSession(now) ? (this.current()?.token ?? null) : null;
  }

  /** Restaura la sesión desde Keystore (Android) o cookie HttpOnly (Web) de manera segura. */
  restore(): Promise<void> {
    if (this.hasValidSession()) return Promise.resolve();
    const revision = this.revision;
    const attempt = this.attempt;
    this.restoration ??= (async () => {
      try {
        const stored = await this.store.load();
        if (revision !== this.revision || attempt !== this.attempt || this.current() !== null) return;
        if (!stored) {
          if (this.webCookieRefresh) {
            await this.runSingleFlightRefresh(undefined, true);
          }
          return;
        }
        const accessExpired = stored.expiresAt === null || stored.expiresAt - EXPIRY_SKEW_MS <= Date.now();
        if (accessExpired) {
          if (stored.refreshToken) {
            await this.runSingleFlightRefresh(stored.refreshToken, false);
          } else {
            this.endSession(true);
          }
          return;
        }
        try {
          // Native persistence does not prove that the server still accepts the token or its roles.
          const user = this.store.persistent
            ? await firstValueFrom(this.repository.restoreUser(stored.token))
            : stored.user;
          if (revision !== this.revision || attempt !== this.attempt) return;
          if (user.id !== stored.user.id) throw new SessionStorageError();
          this.current.set({ ...stored, user });
          this.armExpiry();
        } catch (error) {
          if (revision !== this.revision || attempt !== this.attempt) return;
          if (isUnauthorized(error) && stored.refreshToken) {
            await this.runSingleFlightRefresh(stored.refreshToken, false);
            return;
          }
          throw error;
        }
      } catch (error) {
        if (revision !== this.revision || attempt !== this.attempt) return;
        if (isTransientFailure(error)) {
          // Retain encrypted state without exposing it. The next attempt must still revalidate.
          this.restoration = null;
          return;
        }
        if (error instanceof SessionStorageError) {
          if (error.reason === 'expired') this.expired.set(true);
          else this.storageFailed.set(true);
        }
        if (isUnauthorized(error)) this.expired.set(true);
        await this.safeClear();
      } finally {
        if (!this.hasValidSession()) {
          this.restoration = null;
        }
      }
    })();
    return this.restoration;
  }

  /**
   * Renueva y rota el refresh token de forma serializada (single-flight) para evitar condiciones de carrera
   * cuando varias peticiones simultáneas reciben HTTP 401.
   */
  refreshSession(explicitRefreshToken?: string): Promise<boolean> {
    return this.runSingleFlightRefresh(explicitRefreshToken ?? this.current()?.refreshToken ?? undefined, false);
  }

  private runSingleFlightRefresh(explicitRefreshToken: string | undefined, silentAnonymous: boolean): Promise<boolean> {
    if (this.activeRefresh) return this.activeRefresh;
    const startRevision = this.revision;
    const startAttempt = this.attempt;
    const tokenCandidate = explicitRefreshToken ?? this.current()?.refreshToken ?? undefined;
    if (!tokenCandidate && !this.webCookieRefresh) return Promise.resolve(false);

    this.activeRefresh = (async () => {
      try {
        const refreshed = await firstValueFrom(this.repository.refreshSession(tokenCandidate));
        if (startRevision !== this.revision || startAttempt !== this.attempt) return false;
        const sameUser = this.current()?.user.id === refreshed.user.id;
        await firstValueFrom(this.establish(refreshed, sameUser));
        return true;
      } catch (error) {
        if (startRevision !== this.revision || startAttempt !== this.attempt) return false;
        if (isTransientFailure(error)) {
          return false;
        }
        if (silentAnonymous && isUnauthorized(error)) {
          return false;
        }
        if (isUnauthorized(error) || (typeof error === 'object' && error !== null && 'status' in error && error.status === 403)) {
          await this.endSession(true);
        }
        return false;
      } finally {
        this.activeRefresh = null;
      }
    })();
    return this.activeRefresh;
  }

  login(credentials: LoginCredentials): Observable<LoginResult> {
    return defer(() => {
      const attempt = ++this.attempt;
      return this.repository.login(credentials).pipe(switchMap((outcome): Observable<LoginResult> => {
        if (attempt !== this.attempt) throw new SessionStorageError();
        if (outcome.kind === 'two-factor') {
          if (this.current() || this.store.persistent) this.endSession(false);
          return of(outcome);
        }
        return this.establish(outcome.session).pipe(map(() => ({ kind: 'authenticated', user: outcome.session.user })));
      }));
    });
  }

  authenticateWithGoogle(idToken: string, nonce: string): Observable<GoogleLoginResult> {
    return defer(() => {
      const attempt = ++this.attempt;
      return this.repository.authenticateWithGoogle(idToken, nonce).pipe(switchMap((outcome): Observable<GoogleLoginResult> => {
        if (attempt !== this.attempt) throw new SessionStorageError();
        if (outcome.kind === 'two-factor') {
          if (this.current() || this.store.persistent) this.endSession(false);
          return of(outcome);
        }
        if (outcome.kind === 'registration-required') {
          return of(outcome);
        }
        return this.establish(outcome.session).pipe(map(() => ({ kind: 'authenticated', user: outcome.session.user })));
      }));
    });
  }

  completeGoogleRegistration(input: CompleteGoogleRegistrationInput): Observable<AuthUser> {
    return defer(() => {
      const attempt = ++this.attempt;
      return this.repository.completeGoogleRegistration(input).pipe(switchMap((session) => {
        if (attempt !== this.attempt) throw new SessionStorageError();
        return this.establish(session).pipe(map(() => session.user));
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
  verifyEmailCode(email: string, code: string): Observable<void> { return this.repository.verifyEmailCode(email, code); }
  requestPasswordReset(email: string): Observable<void> { return this.repository.requestPasswordReset(email); }
  confirmPasswordReset(token: string, newPassword: string): Observable<void> {
    return this.repository.confirmPasswordReset(token, newPassword);
  }

  /**
   * Cierra la sesión local siempre, revoca la sesión y refresh token en el backend,
   * y limpia el estado de selección automática de Google.
   */
  logout(): Observable<{ readonly remoteRevoked: boolean }> {
    return defer(() => {
      const token = this.validToken() ?? this.current()?.token ?? null;
      const refreshToken = this.current()?.refreshToken ?? null;
      const clearing = this.endSession(false);
      void this.googleIdentity.clearCredentialState();
      const remote$ = token !== null
        ? this.repository.logout(token, refreshToken).pipe(map(() => true), catchError(() => of(false)))
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

  clearAfterPasswordChange(): Promise<void> {
    void this.googleIdentity.clearCredentialState();
    return this.endSession(false);
  }

  private establish(session: AuthSession, silentRotation = false): Observable<void> {
    const previous = this.current();
    const revision = ++this.revision;
    if (!silentRotation || (previous && previous.user.id !== session.user.id)) {
      ++this.sessionEpoch;
    }
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
    if (!silentRotation) {
      this.current.set(null);
      // Reauthentication suspends the previous native session even when the identity is unchanged.
      if (previous && previous.user.id === session.user.id) this.ended.next();
    }
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
      if (!this.hasValidSession()) {
        if (this.canRefresh()) {
          void this.refreshSession().then((ok) => {
            if (!ok && revision === this.revision && !this.hasValidSession()) this.handleUnauthorized();
          });
        } else {
          this.handleUnauthorized();
        }
      } else {
        this.armExpiry();
      }
    }, Math.max(0, Math.min(expiresAt - Date.now() - EXPIRY_SKEW_MS, 2_147_483_647)));
  }

  private endSession(expiredNotice: boolean): Promise<void> {
    ++this.revision;
    ++this.sessionEpoch;
    ++this.attempt;
    clearTimeout(this.expiryTimer);
    this.restoration = null;
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

function isUnauthorized(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 401;
}

function isTransientFailure(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error
    && typeof error.status === 'number' && (error.status === 0 || error.status === 429 || error.status >= 500);
}
