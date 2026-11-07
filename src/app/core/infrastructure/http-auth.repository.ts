import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import type { AuthRepository } from '../repositories/auth.repository';
import type {
  LoginCredentials,
  RegisterInput,
  TwoFactorChallenge,
  TwoFactorVerification,
} from '../models/auth.model';
import { ApiClientService } from '../api/api-client.service';
import {
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
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim(),
      password: input.password,
    };
    if (input.phone?.trim()) body['phone'] = input.phone.trim();
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

  logout() {
    return this.api.post<unknown>('/api/auth/logout', {}, { auth: true }).pipe(map(() => undefined));
  }
}
