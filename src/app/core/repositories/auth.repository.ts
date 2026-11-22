import { InjectionToken, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  AuthSession,
  AuthUser,
  CompleteGoogleRegistrationInput,
  GoogleAuthConfig,
  GoogleAuthOutcome,
  GoogleChallenge,
  LoginCredentials,
  LoginOutcome,
  RegisterInput,
  TwoFactorChallenge,
  TwoFactorVerification,
  UsernameAvailability,
} from '../models/auth.model';
import { HttpAuthRepository } from '../infrastructure/http-auth.repository';

/**
 * Puerto de autenticación contra Spring Boot. La presentación no conoce HttpClient ni rutas.
 * Un resultado exitoso de `login` puede ser un desafío 2FA, que NO equivale a una sesión.
 */
export interface AuthRepository {
  login(credentials: LoginCredentials): Observable<LoginOutcome>;
  sendTwoFactorEmailCode(challenge: TwoFactorChallenge): Observable<void>;
  verifyTwoFactor(verification: TwoFactorVerification): Observable<AuthSession>;
  register(input: RegisterInput): Observable<void>;
  resendVerification(email: string): Observable<void>;
  verifyEmail(token: string): Observable<void>;
  verifyEmailCode(email: string, code: string): Observable<void>;
  requestPasswordReset(email: string): Observable<void>;
  confirmPasswordReset(token: string, newPassword: string): Observable<void>;
  logout(token: string, refreshToken?: string | null): Observable<void>;
  restoreUser(token: string): Observable<AuthUser>;
  refreshSession(refreshToken?: string | null): Observable<AuthSession>;
  getGoogleConfig(): Observable<GoogleAuthConfig>;
  createGoogleChallenge(purpose?: 'AUTH' | 'LINK' | 'REAUTH'): Observable<GoogleChallenge>;
  authenticateWithGoogle(idToken: string, nonce: string): Observable<GoogleAuthOutcome>;
  completeGoogleRegistration(input: CompleteGoogleRegistrationInput): Observable<AuthSession>;
  checkUsernameAvailability(username: string): Observable<UsernameAvailability>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AUTH_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(HttpAuthRepository),
});
