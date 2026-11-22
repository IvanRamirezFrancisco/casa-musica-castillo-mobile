import { normalizePersonName, normalizePhone } from '../validation/auth-fields.validation';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url.token';
import type { AuthRepository } from '../repositories/auth.repository';
import type {
  CompleteGoogleRegistrationInput,
  LoginCredentials,
  RegisterInput,
  TwoFactorChallenge,
  TwoFactorVerification,
} from '../models/auth.model';
import { ApiClientService } from '../api/api-client.service';
import { WEB_COOKIE_REFRESH_ENABLED } from '../security/web-cookie-refresh.token';
import {
  parseAuthUser,
  parseGoogleAuthResponse,
  parseGoogleChallenge,
  parseGoogleConfig,
  parseJwtAuthResponse,
  parseLoginResponse,
  parseRefreshSessionResponse,
  parseTwoFactorVerifyResponse,
  parseUsernameAvailability,
  unwrapApiResponse,
} from '../api/auth.validation';

/**
 * Contratos verificados en AuthController, GoogleAuthController, TwoFactorController y SecurePasswordResetController.
 * Recuperación de contraseña: se usa el flujo `/password-reset/*` (cuerpo JSON).
 */
@Injectable({ providedIn: 'root' })
export class HttpAuthRepository implements AuthRepository {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL).replace(/\/+$/, '');
  private readonly webCookieRefresh = inject(WEB_COOKIE_REFRESH_ENABLED);

  private get isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  private sessionTransportOptions(): { headers?: Record<string, string>; withCredentials?: boolean } {
    if (this.isAndroidNative) {
      return { headers: { 'X-Client-Platform': 'android' }, withCredentials: false };
    }
    if (this.webCookieRefresh) {
      return { headers: { 'X-Requested-With': 'XMLHttpRequest' }, withCredentials: true };
    }
    return {};
  }

  /** The candidate token is used only for /me; no user or role is trusted before Spring validates it. */
  restoreUser(token: string) {
    return this.http.get<unknown>(`${this.base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', redirect: 'error', cache: 'no-store', timeout: 15_000,
    }).pipe(map(parseAuthUser));
  }

  login(credentials: LoginCredentials) {
    return this.api
      .post<unknown>(
        '/api/auth/login',
        { email: credentials.email.trim(), password: credentials.password },
        this.sessionTransportOptions(),
      )
      .pipe(map(parseLoginResponse));
  }

  sendTwoFactorEmailCode(challenge: TwoFactorChallenge) {
    return this.api
      .post<unknown>('/api/2fa/send-login-code', { preAuthChallenge: challenge.preAuthChallenge, method: 'EMAIL' })
      .pipe(map((body) => void unwrapApiResponse(body)));
  }

  verifyTwoFactor(verification: TwoFactorVerification) {
    return this.api
      .post<unknown>(
        '/api/2fa/verify',
        {
          preAuthChallenge: verification.preAuthChallenge,
          method: verification.method,
          code: verification.code.trim(),
        },
        this.sessionTransportOptions(),
      )
      .pipe(map(parseTwoFactorVerifyResponse));
  }

  register(input: RegisterInput) {
    const body: Record<string, unknown> = {
      username: input.username.trim(),
      firstName: normalizePersonName(input.firstName),
      lastName: normalizePersonName(input.lastName),
      email: input.email.trim(),
      password: input.password,
    };
    if (input.phone?.trim()) body['phone'] = normalizePhone(input.phone);
    if (input.legalAcceptance) body['legalAcceptance'] = input.legalAcceptance;
    return this.api.post<unknown>('/api/auth/register', body).pipe(map((response) => void unwrapApiResponse(response)));
  }

  resendVerification(email: string) {
    return this.api
      .post<unknown>('/api/auth/resend-verification', { email: email.trim() })
      .pipe(map((body) => void unwrapApiResponse(body)));
  }

  verifyEmail(token: string) {
    return this.api
      .post<unknown>('/api/auth/verify-email', { token: token.trim() })
      .pipe(map((body) => void unwrapApiResponse(body)));
  }

  verifyEmailCode(email: string, code: string) {
    return this.api.post<unknown>('/api/auth/verify-email-code', { email: email.trim(), code })
      .pipe(map((body) => void unwrapApiResponse(body)));
  }

  requestPasswordReset(email: string) {
    return this.api
      .post<unknown>('/api/auth/password-reset/request', { email: email.trim() })
      .pipe(map((body) => void unwrapApiResponse(body)));
  }

  confirmPasswordReset(token: string, newPassword: string) {
    return this.api
      .post<unknown>('/api/auth/password-reset/confirm', { token: token.trim(), newPassword })
      .pipe(map((body) => void unwrapApiResponse(body)));
  }

  refreshSession(refreshToken?: string | null) {
    const body = this.isAndroidNative && refreshToken ? { refreshToken } : {};
    return this.api
      .post<unknown>('/api/auth/session/refresh', body, this.sessionTransportOptions())
      .pipe(map(parseRefreshSessionResponse));
  }

  getGoogleConfig() {
    return this.api.get<unknown>('/api/auth/google/config').pipe(map(parseGoogleConfig));
  }

  createGoogleChallenge(purpose: 'AUTH' | 'LINK' | 'REAUTH' = 'AUTH') {
    if (purpose === 'LINK' || purpose === 'REAUTH') {
      return this.api
        .post<unknown>('/api/auth/google/authenticated-challenge', { purpose }, { auth: true })
        .pipe(map(parseGoogleChallenge));
    }
    return this.api.post<unknown>('/api/auth/google/challenge', { purpose }).pipe(map(parseGoogleChallenge));
  }

  authenticateWithGoogle(idToken: string, nonce: string) {
    return this.api
      .post<unknown>('/api/auth/google/authenticate', { idToken, nonce }, this.sessionTransportOptions())
      .pipe(map(parseGoogleAuthResponse));
  }

  completeGoogleRegistration(input: CompleteGoogleRegistrationInput) {
    const body: Record<string, unknown> = {
      registrationToken: input.registrationToken,
      username: input.username.trim(),
      firstName: normalizePersonName(input.firstName),
      lastName: normalizePersonName(input.lastName),
    };
    if (input.legalAcceptance) body['legalAcceptance'] = input.legalAcceptance;
    return this.api
      .post<unknown>('/api/auth/google/complete-registration', body, this.sessionTransportOptions())
      .pipe(map((raw) => {
        const data = unwrapApiResponse(raw)['data'];
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid registration response');
        return parseJwtAuthResponse((data as Record<string, unknown>)['jwtResponse']);
      }));
  }

  checkUsernameAvailability(username: string) {
    return this.api
      .get<unknown>(`/api/auth/check-username/${encodeURIComponent(username.trim())}`)
      .pipe(map(parseUsernameAvailability));
  }

  logout(token: string, refreshToken?: string | null) {
    const body = this.isAndroidNative && refreshToken ? { refreshToken } : {};
    const transport = this.sessionTransportOptions();
    return this.http.post<unknown>(`${this.base}/api/auth/logout`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(transport.headers ?? {}),
      },
      credentials: transport.withCredentials ? 'include' : 'omit',
      withCredentials: transport.withCredentials === true,
      redirect: 'error',
      timeout: 15_000,
    }).pipe(map(() => undefined));
  }
}
