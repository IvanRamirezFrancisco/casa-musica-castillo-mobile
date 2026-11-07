import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, catchError, finalize, map, of, tap } from 'rxjs';
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

  readonly user = computed(() => this.current()?.user ?? null);
  /** Hubo una sesión que terminó por expiración o 401; la pantalla de inicio debe informarlo. */
  readonly sessionExpired = this.expired.asReadonly();
  /** `false`: la sesión sólo vive en memoria y se pierde al cerrar la aplicación. */
  readonly persistent = this.store.persistent;
  readonly sessionEnded$ = this.ended.asObservable();

  hasValidSession(now = Date.now()): boolean {
    const session = this.current();
    return session !== null && (session.expiresAt === null || session.expiresAt - EXPIRY_SKEW_MS > now);
  }

  /** JWT vigente o `null`. Solo para el interceptor HTTP. */
  validToken(now = Date.now()): string | null {
    return this.hasValidSession(now) ? (this.current()?.token ?? null) : null;
  }

  /** Restaura la sesión del almacén (una sola vez). Sin persistencia nativa solo existe memoria. */
  restore(): Promise<void> {
    this.restoration ??= (async () => {
      try {
        const stored = await this.store.load();
        if (stored && this.current() === null) {
          this.current.set(stored);
          if (!this.hasValidSession()) this.endSession(true);
        }
      } catch {
        await this.safeClear();
      }
    })();
    return this.restoration;
  }

  login(credentials: LoginCredentials): Observable<LoginResult> {
    return this.repository.login(credentials).pipe(
      map((outcome): LoginResult => {
        if (outcome.kind === 'two-factor') return outcome;
        this.establish(outcome.session);
        return { kind: 'authenticated', user: outcome.session.user };
      }),
    );
  }

  sendTwoFactorEmailCode(challenge: TwoFactorChallenge): Observable<void> {
    return this.repository.sendTwoFactorEmailCode(challenge);
  }

  completeTwoFactor(verification: TwoFactorVerification): Observable<AuthUser> {
    return this.repository.verifyTwoFactor(verification).pipe(
      tap((session) => this.establish(session)),
      map((session) => session.user),
    );
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
    const hadToken = this.validToken() !== null;
    const remote$: Observable<boolean> = hadToken
      ? this.repository.logout().pipe(map(() => true), catchError(() => of(false)))
      : of(false);
    return remote$.pipe(
      finalize(() => this.endSession(false)),
      map((remoteRevoked) => ({ remoteRevoked })),
    );
  }

  /** HTTP 401 o token vencido: limpia credenciales y vuelve a Iniciar sesión. 403 no pasa por aquí. */
  handleUnauthorized(navigate = true): void {
    this.endSession(true);
    if (navigate && !this.redirecting && !this.router.url.startsWith('/login')) {
      this.redirecting = true;
      void this.router.navigate(['/login'], { replaceUrl: true }).finally(() => { this.redirecting = false; });
    }
  }

  acknowledgeExpiry(): void {
    this.expired.set(false);
  }

  private establish(session: AuthSession): void {
    const previous = this.current();
    if (previous && previous.user.id !== session.user.id) this.ended.next();
    this.current.set(session);
    this.expired.set(false);
    void this.store.save(session).catch(() => undefined);
  }

  private endSession(expiredNotice: boolean): void {
    const had = this.current() !== null;
    this.current.set(null);
    this.expired.set(expiredNotice);
    void this.safeClear();
    if (had) this.ended.next();
  }

  private async safeClear(): Promise<void> {
    try { await this.store.clear(); } catch { /* el estado en memoria ya fue descartado */ }
  }
}
