/** Usuario autenticado según el contrato real de Spring Boot (`UserResponse`). Sin credenciales. */
export interface AuthUser {
  readonly id: number;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string | null;
  readonly roles: readonly string[];
  readonly twoFactorEnabled: boolean;
}

/**
 * Sesión autenticada. `token` es el JWT de acceso (no existe refresh token funcional en el backend).
 * `expiresAt` proviene de la reclamación `exp` del JWT, en milisegundos; `null` si el token no la incluye.
 */
export interface AuthSession {
  readonly token: string;
  readonly expiresAt: number | null;
  readonly user: AuthUser;
}

export type TwoFactorMethod = 'EMAIL' | 'GOOGLE_AUTHENTICATOR' | 'BACKUP_CODE';

/** Desafío 2FA emitido tras validar la contraseña. NO es una sesión autenticada. */
export interface TwoFactorChallenge {
  readonly preAuthChallenge: string;
  readonly methods: readonly TwoFactorMethod[];
}

export type LoginOutcome =
  | { readonly kind: 'authenticated'; readonly session: AuthSession }
  | { readonly kind: 'two-factor'; readonly challenge: TwoFactorChallenge };

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

/** Campos exactos de `RegisterRequest` del backend. */
export interface RegisterInput {
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
  readonly phone?: string;
}

export interface TwoFactorVerification {
  readonly preAuthChallenge: string;
  readonly method: TwoFactorMethod;
  readonly code: string;
}

/**
 * Persistencia de la sesión. Una implementación `persistent === false` solo mantiene la sesión
 * en memoria del proceso: no sobrevive a cerrar la app y no debe presentarse como persistencia.
 */
export interface SessionStore {
  readonly persistent: boolean;
  save(session: AuthSession): Promise<void>;
  load(): Promise<AuthSession | null>;
  clear(): Promise<void>;
}
