import { normalizePersonName, normalizePhone } from '../validation/auth-fields.validation';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url.token';
import type { AuthRepository } from '../repositories/auth.repository';
import type {
  LoginCredentials,
  RegisterInput,
  TwoFactorChallenge,
  TwoFactorVerification,
} from '../models/auth.model';
import { ApiClientService } from '../api/api-client.service';
import {
  parseAuthUser,
  parseLoginResponse,
  parseTwoFactorVerifyResponse,
  unwrapApiResponse,
} from '../api/auth.validation';

/**
 * Contratos verificados en AuthController, TwoFactorController y SecurePasswordResetController.
 * Recuperación de contraseña: se usa el flujo `/password-reset/*` (cuerpo JSON). El flujo heredado
 * `/forgot-password` recibe el correo como parámetro de URL y por eso no se utiliza.
 * No existe endpoint de refresh token: la sesión dura lo que dure el JWT de acceso.
 */
@Injectable({ providedIn: 'root' })
export class HttpAuthRepository implements AuthRepository {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL).replace(/\/+$/, '');

  /** The candidate token is used only for /me; no user or role is trusted before Spring validates it. */
  restoreUser(token: string) {
    return this.http.get<unknown>(`${this.base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', cache: 'no-store', timeout: 15_000,
    }).pipe(map(parseAuthUser));
  }

  login(credentials: LoginCredentials) {
    return this.api
      .post<unknown>('/api/auth/login', { email: credentials.email.trim(), password: credentials.password })
      .pipe(map(parseLoginResponse));
  }

  sendTwoFactorEmailCode(challenge: TwoFactorChallenge) {
    return this.api
      .post<unknown>('/api/2fa/send-login-code', { preAuthChallenge: challenge.preAuthChallenge, method: 'EMAIL' })
      .pipe(map((body) => void unwrapApiResponse(body)));
  }

  verifyTwoFactor(verification: TwoFactorVerification) {
    return this.api
      .post<unknown>('/api/2fa/verify', {
        preAuthChallenge: verification.preAuthChallenge,
        method: verification.method,
        code: verification.code.trim(),
      })
      .pipe(map(parseTwoFactorVerifyResponse));
  }

  register(input: RegisterInput) {
    const body: Record<string, string> = {
      username: input.username.trim(),
      firstName: normalizePersonName(input.firstName),
      lastName: normalizePersonName(input.lastName),
      email: input.email.trim(),
      password: input.password,
    };
    if (input.phone?.trim()) body['phone'] = normalizePhone(input.phone);
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

  logout(token: string) {
    // Snapshot token: local logout does not wait for network revocation, and cannot revoke a later session.
    return this.http.post<unknown>(`${this.base}/api/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', timeout: 15_000,
    }).pipe(map(() => undefined));
  }
}
