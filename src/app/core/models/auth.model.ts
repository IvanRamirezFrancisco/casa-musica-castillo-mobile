/** Usuario autenticado según el contrato real de Spring Boot (`UserResponse`). Sin credenciales. */
export interface AuthUser {
  readonly id: number;
  readonly username?: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string | null;
  readonly avatarUrl?: string | null;
  readonly hasLocalPassword?: boolean;
  readonly googleLinked?: boolean;
  readonly roles: readonly string[];
  readonly twoFactorEnabled: boolean;
}

/**
 * Sesión autenticada. `token` es el JWT de acceso y `refreshToken` (solo Android Keystore nativo)
 * permite rotar y renovar la sesión sin almacenar contraseñas ni tokens en texto plano.
 * En Web, el refresh token viaja exclusivamente en una cookie HttpOnly.
 */
export interface AuthSession {
  readonly token: string;
  readonly expiresAt: number | null;
  readonly refreshToken?: string | null;
  readonly user: AuthUser;
}

export type TwoFactorMethod = 'EMAIL' | 'GOOGLE_AUTHENTICATOR' | 'BACKUP_CODE';

/** Desafío 2FA emitido tras validar la contraseña o Google ID token. NO es una sesión autenticada. */
export interface TwoFactorChallenge {
  readonly preAuthChallenge: string;
  readonly methods: readonly TwoFactorMethod[];
  readonly maskedEmail?: string;
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
  readonly legalAcceptance?: {
    readonly termsAccepted: boolean;
    readonly privacyRead: boolean;
    readonly termsVersion: string;
    readonly privacyVersion: string;
  };
}

export interface TwoFactorVerification {
  readonly preAuthChallenge: string;
  readonly method: TwoFactorMethod;
  readonly code: string;
}

export interface GoogleAuthConfig {
  readonly enabled: boolean;
  readonly webClientId: string;
}

export interface GoogleChallenge {
  readonly nonce: string;
  readonly expiresInSeconds: number;
}

export interface GoogleProfilePrefill {
  readonly email: string;
  readonly emailVerified: boolean;
  readonly firstName: string;
  readonly lastName: string;
  readonly pictureUrl: string | null;
  readonly suggestedUsername: string;
}

export interface GoogleLegalDocuments {
  readonly required: boolean;
  readonly termsVersion: string;
  readonly privacyVersion: string;
}

export interface PendingGoogleRegistration {
  readonly registrationToken: string;
  readonly profile: GoogleProfilePrefill;
  readonly legal: GoogleLegalDocuments | null;
}

export type GoogleAuthOutcome =
  | { readonly kind: 'authenticated'; readonly session: AuthSession }
  | { readonly kind: 'two-factor'; readonly challenge: TwoFactorChallenge }
  | { readonly kind: 'registration-required'; readonly pending: PendingGoogleRegistration };

export interface CompleteGoogleRegistrationInput {
  readonly registrationToken: string;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly legalAcceptance?: {
    readonly termsAccepted: boolean;
    readonly privacyRead: boolean;
    readonly termsVersion: string;
    readonly privacyVersion: string;
  };
}

export interface UsernameAvailability {
  readonly available: boolean;
  readonly message: string;
}

export interface AccountSecurityCapabilities {
  readonly twoFactorEnabled: boolean;
  readonly googleAuthEnabled: boolean;
  readonly emailEnabled: boolean;
  readonly backupCodesEnabled: boolean;
  readonly emailVerified: boolean;
  readonly hasLocalPassword: boolean;
  readonly googleLinked: boolean;
  readonly googleConfigured: boolean;
  readonly googleEmail: string | null;
  readonly googleLinkedAt: string | null;
  readonly canSetInitialPassword: boolean;
  readonly canChangePassword: boolean;
  readonly canLinkGoogle: boolean;
  readonly canUnlinkGoogle: boolean;
  readonly hasValidAuthMethod: boolean;
  readonly mfaActive: boolean;
  readonly requiresRecentAuth: boolean;
  readonly passwordChangeRevokesSessions: boolean;
}

export interface GoogleReauthInput {
  readonly idToken: string;
  readonly nonce: string;
  readonly purpose: 'SET_INITIAL_PASSWORD' | 'LINK_GOOGLE' | 'UNLINK_GOOGLE' | 'SECURITY_STEP_UP' | 'DELETE_ACCOUNT';
  readonly mfaMethod?: TwoFactorMethod;
  readonly mfaCode?: string;
}

export interface LinkGoogleInput {
  readonly idToken: string;
  readonly nonce: string;
  readonly currentPassword: string;
  readonly confirmed: boolean;
  readonly mfaMethod?: TwoFactorMethod;
  readonly mfaCode?: string;
}

export interface PrepareLinkGoogleInput {
  readonly idToken: string;
  readonly nonce: string;
  readonly currentPassword: string;
  readonly mfaMethod?: TwoFactorMethod;
  readonly mfaCode?: string;
}

export interface PendingGoogleLinkConfirmation {
  readonly confirmationToken: string;
  readonly expiresInSeconds: number;
  readonly currentAccountEmail: string;
  readonly googleEmail: string;
  readonly googleEmailVerified: boolean;
  readonly googleName: string;
  readonly googlePictureUrl: string | null;
  readonly sameEmail: boolean;
}

export interface UnlinkGoogleInput {
  readonly currentPassword?: string;
  readonly reauthToken?: string;
  readonly confirmed: boolean;
  readonly mfaMethod?: TwoFactorMethod;
  readonly mfaCode?: string;
}

export type StepUpProof = string | { readonly reauthToken: string };

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
