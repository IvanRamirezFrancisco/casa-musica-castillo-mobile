import type {
  AccountSecurityCapabilities,
  AuthSession,
  AuthUser,
  GoogleAuthConfig,
  GoogleAuthOutcome,
  GoogleChallenge,
  GoogleLegalDocuments,
  LoginOutcome,
  TwoFactorMethod,
  UsernameAvailability,
} from '../models/auth.model';
import { looksLikeJwt, readJwtExpiry, readJwtSubject } from '../security/jwt.util';
import { ApiError } from './api-error';

const KNOWN_METHODS: readonly TwoFactorMethod[] = ['EMAIL', 'GOOGLE_AUTHENTICATOR', 'BACKUP_CODE'];
const CHALLENGE_SHAPE = /^[A-Za-z0-9_-]{43}$/;

const invalid = () => new ApiError('invalid-response', 200);
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const positiveId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

/** `ApiResponse{success,message,data}` del backend. Un HTTP 200 con `success !== true` no es éxito. */
export function unwrapApiResponse(body: unknown): Record<string, unknown> {
  if (!object(body) || body['success'] !== true) throw invalid();
  return body;
}

export function parseAuthUser(value: unknown): AuthUser {
  if (!object(value) || !positiveId(value['id']) || typeof value['email'] !== 'string' || !value['email'].includes('@')) {
    throw invalid();
  }
  const text = (field: string): string => {
    const raw = value[field];
    if (raw === null || raw === undefined) return '';
    if (typeof raw !== 'string') throw invalid();
    return raw;
  };
  const optText = (field: string): string | null | undefined => {
    const raw = value[field];
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (typeof raw !== 'string') throw invalid();
    return raw;
  };
  const optBool = (field: string): boolean | undefined => {
    const raw = value[field];
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw !== 'boolean') throw invalid();
    return raw;
  };
  const phone = value['phone'];
  if (phone !== null && phone !== undefined && typeof phone !== 'string') throw invalid();
  const roles = value['roles'];
  if (roles !== null && roles !== undefined && (!Array.isArray(roles) || !roles.every((role) => typeof role === 'string'))) {
    throw invalid();
  }
  const twoFactor = value['twoFactorEnabled'];
  if (twoFactor !== null && twoFactor !== undefined && typeof twoFactor !== 'boolean') throw invalid();
  const username = optText('username');
  const avatarUrl = optText('avatarUrl');
  const hasLocalPassword = optBool('hasLocalPassword');
  const googleLinked = optBool('googleLinked');
  return {
    id: value['id'],
    ...(username ? { username } : {}),
    email: value['email'],
    firstName: text('firstName'),
    lastName: text('lastName'),
    phone: typeof phone === 'string' && phone ? phone : null,
    ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl && avatarUrl.startsWith('https://') ? avatarUrl : null } : {}),
    ...(hasLocalPassword !== undefined ? { hasLocalPassword } : {}),
    ...(googleLinked !== undefined ? { googleLinked } : {}),
    roles: Array.isArray(roles) ? (roles as string[]) : [],
    twoFactorEnabled: twoFactor === true,
  };
}

/** `JwtAuthResponse`: usado por `/api/2fa/verify`, `/api/auth/session/refresh`, Google auth y `/api/auth/login`. */
export function parseJwtAuthResponse(value: unknown, allowExpiredAccess = false): AuthSession {
  if (!object(value) || !looksLikeJwt(value['accessToken'])) throw invalid();
  const tokenType = value['tokenType'];
  if (tokenType !== undefined && tokenType !== null && tokenType !== 'Bearer') throw invalid();
  const token = value['accessToken'];
  const expiresAt = readJwtExpiry(token);
  if (expiresAt === null || !Number.isFinite(expiresAt) || (!allowExpiredAccess && expiresAt <= Date.now())) throw invalid();
  const refreshRaw = value['refreshToken'];
  if (refreshRaw !== undefined && refreshRaw !== null && (typeof refreshRaw !== 'string' || !refreshRaw.trim())) {
    throw invalid();
  }
  const user = parseAuthUser(value['user']);
  if (readJwtSubject(token) !== String(user.id)) throw invalid();
  const refreshToken = typeof refreshRaw === 'string' ? refreshRaw.trim() : null;
  return { token, expiresAt, ...(refreshToken ? { refreshToken } : {}), user };
}

/**
 * `/api/auth/login` devuelve dos formas con el mismo HTTP 200:
 *  - sesión: `data.jwtResponse{accessToken,user}`;
 *  - desafío 2FA: `data{twoFactorRequired:true,preAuthChallenge,availableMethods}` (sin token).
 */
export function parseLoginResponse(body: unknown): LoginOutcome {
  const data = unwrapApiResponse(body)['data'];
  if (!object(data)) throw invalid();
  if (data['twoFactorRequired'] === true) {
    return { kind: 'two-factor', challenge: parseTwoFactorChallenge(data) };
  }
  return { kind: 'authenticated', session: parseJwtAuthResponse(data['jwtResponse']) };
}

export function parseTwoFactorVerifyResponse(body: unknown): AuthSession {
  return parseJwtAuthResponse(unwrapApiResponse(body)['data']);
}

export function parseRefreshSessionResponse(body: unknown): AuthSession {
  return parseJwtAuthResponse(unwrapApiResponse(body)['data']);
}

export function parseGoogleConfig(body: unknown): GoogleAuthConfig {
  const data = unwrapApiResponse(body)['data'];
  if (!object(data) || typeof data['enabled'] !== 'boolean' || typeof data['webClientId'] !== 'string') {
    throw invalid();
  }
  return {
    enabled: data['enabled'] && data['webClientId'].trim().length > 0,
    webClientId: data['webClientId'].trim(),
  };
}

export function parseGoogleChallenge(body: unknown): GoogleChallenge {
  const data = unwrapApiResponse(body)['data'];
  if (!object(data) || typeof data['nonce'] !== 'string' || !data['nonce'].trim()) throw invalid();
  const ttl = data['expiresInSeconds'];
  return {
    nonce: data['nonce'].trim(),
    expiresInSeconds: typeof ttl === 'number' && Number.isFinite(ttl) && ttl > 0 ? ttl : 300,
  };
}

export function parseGoogleAuthResponse(body: unknown): GoogleAuthOutcome {
  const data = unwrapApiResponse(body)['data'];
  if (!object(data) || typeof data['outcome'] !== 'string') throw invalid();
  switch (data['outcome']) {
    case 'AUTHENTICATED':
      return { kind: 'authenticated', session: parseJwtAuthResponse(data['jwtResponse']) };
    case 'TWO_FACTOR_REQUIRED':
      return { kind: 'two-factor', challenge: parseTwoFactorChallenge(data) };
    case 'REGISTRATION_REQUIRED': {
      const registrationToken = data['registrationToken'];
      const profile = data['profile'];
      if (typeof registrationToken !== 'string' || registrationToken.length < 24 || !object(profile)) throw invalid();
      if (typeof profile['email'] !== 'string' || !profile['email'].includes('@')) throw invalid();
      const firstName = typeof profile['firstName'] === 'string' ? profile['firstName'] : '';
      const lastName = typeof profile['lastName'] === 'string' ? profile['lastName'] : '';
      const pictureRaw = profile['pictureUrl'];
      const pictureUrl = typeof pictureRaw === 'string' && pictureRaw.startsWith('https://') ? pictureRaw : null;
      const suggestedUsername = typeof profile['suggestedUsername'] === 'string' ? profile['suggestedUsername'] : '';
      let legal: GoogleLegalDocuments | null = null;
      if (object(data['legal']) && data['legal']['required'] === true) {
        const termsVersion = data['legal']['termsVersion'];
        const privacyVersion = data['legal']['privacyVersion'];
        if (typeof termsVersion !== 'string' || typeof privacyVersion !== 'string') throw invalid();
        legal = { required: true, termsVersion, privacyVersion };
      }
      return {
        kind: 'registration-required',
        pending: {
          registrationToken,
          profile: {
            email: profile['email'],
            emailVerified: profile['emailVerified'] === true,
            firstName,
            lastName,
            pictureUrl,
            suggestedUsername,
          },
          legal,
        },
      };
    }
    default:
      throw invalid();
  }
}

export function parseUsernameAvailability(body: unknown): UsernameAvailability {
  if (!object(body) || typeof body['available'] !== 'boolean') throw invalid();
  const message = typeof body['message'] === 'string' ? body['message'] : '';
  return { available: body['available'], message };
}

export function parseAccountSecurityCapabilities(raw: unknown): AccountSecurityCapabilities {
  const data = unwrapApiResponse(raw)['data'];
  if (!object(data)) throw invalid();
  const revokes = data['passwordChangeRevokesSessions'];
  if (typeof revokes !== 'boolean') throw invalid();
  const boolOrDefault = (key: string, fallback: boolean): boolean => {
    const v = data[key];
    if (v === undefined || v === null) return fallback;
    if (typeof v !== 'boolean') throw invalid();
    return v;
  };
  const optString = (key: string): string | null => {
    const v = data[key];
    if (v === undefined || v === null) return null;
    if (typeof v !== 'string') throw invalid();
    return v.trim() || null;
  };
  const hasLocalPassword = boolOrDefault('hasLocalPassword', true);
  const googleLinked = boolOrDefault('googleLinked', false);
  const googleConfigured = boolOrDefault('googleConfigured', false);
  const mfaActive = boolOrDefault(
    'mfaActive',
    boolOrDefault('googleAuthEnabled', false) || boolOrDefault('emailEnabled', false),
  );
  return {
    twoFactorEnabled: boolOrDefault('twoFactorEnabled', false),
    googleAuthEnabled: boolOrDefault('googleAuthEnabled', false),
    emailEnabled: boolOrDefault('emailEnabled', false),
    backupCodesEnabled: boolOrDefault('backupCodesEnabled', false),
    emailVerified: boolOrDefault('emailVerified', false),
    hasLocalPassword,
    googleLinked,
    googleConfigured,
    googleEmail: optString('googleEmail'),
    googleLinkedAt: optString('googleLinkedAt'),
    canSetInitialPassword: boolOrDefault('canSetInitialPassword', !hasLocalPassword && googleLinked),
    canChangePassword: boolOrDefault('canChangePassword', hasLocalPassword),
    canLinkGoogle: boolOrDefault('canLinkGoogle', !googleLinked && hasLocalPassword && googleConfigured),
    canUnlinkGoogle: boolOrDefault('canUnlinkGoogle', googleLinked && hasLocalPassword),
    hasValidAuthMethod: boolOrDefault('hasValidAuthMethod', hasLocalPassword || googleLinked),
    mfaActive,
    requiresRecentAuth: boolOrDefault('requiresRecentAuth', true),
    passwordChangeRevokesSessions: revokes,
  };
}

function parseTwoFactorChallenge(data: Record<string, unknown>): { preAuthChallenge: string; methods: readonly TwoFactorMethod[]; maskedEmail?: string } {
  const challenge = data['preAuthChallenge'];
  const available = data['availableMethods'];
  if (challenge === undefined && object(available) && object(data['user'])) {
    throw new ApiError('incompatible-mfa', 200);
  }
  if (typeof challenge !== 'string' || !CHALLENGE_SHAPE.test(challenge) || !object(available)) throw invalid();
  const methods = KNOWN_METHODS.filter((method) => available[method] === true);
  if (methods.length === 0) throw invalid();
  const maskedEmail = typeof data['maskedEmail'] === 'string' && data['maskedEmail'] ? data['maskedEmail'] : undefined;
  return { preAuthChallenge: challenge, methods, ...(maskedEmail ? { maskedEmail } : {}) };
}
