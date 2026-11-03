import type { AuthSession, AuthUser, LoginOutcome, TwoFactorMethod } from '../models/auth.model';
import { looksLikeJwt, readJwtExpiry } from '../security/jwt.util';
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
  const phone = value['phone'];
  if (phone !== null && phone !== undefined && typeof phone !== 'string') throw invalid();
  const roles = value['roles'];
  if (roles !== null && roles !== undefined && (!Array.isArray(roles) || !roles.every((role) => typeof role === 'string'))) {
    throw invalid();
  }
  const twoFactor = value['twoFactorEnabled'];
  if (twoFactor !== null && twoFactor !== undefined && typeof twoFactor !== 'boolean') throw invalid();
  return {
    id: value['id'],
    email: value['email'],
    firstName: text('firstName'),
    lastName: text('lastName'),
    phone: typeof phone === 'string' && phone ? phone : null,
    roles: Array.isArray(roles) ? (roles as string[]) : [],
    twoFactorEnabled: twoFactor === true,
  };
}

/** `JwtAuthResponse`: usado por `/api/2fa/verify` y anidado en `jwtResponse` por `/api/auth/login`. */
export function parseJwtAuthResponse(value: unknown): AuthSession {
  if (!object(value) || !looksLikeJwt(value['accessToken'])) throw invalid();
  const tokenType = value['tokenType'];
  if (tokenType !== undefined && tokenType !== null && tokenType !== 'Bearer') throw invalid();
  const token = value['accessToken'];
  const expiresAt = readJwtExpiry(token);
  // Spring issues exp on every access token. Never infer an unlimited session from a malformed response.
  if (expiresAt === null || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw invalid();
  return { token, expiresAt, user: parseAuthUser(value['user']) };
}

/**
 * `/api/auth/login` devuelve dos formas con el mismo HTTP 200:
 *  - sesión: `data.jwtResponse{accessToken,user}`;
 *  - desafío 2FA: `data{twoFactorRequired:true,preAuthChallenge,availableMethods}` (sin token).
 * Cualquier otra forma se rechaza; nunca se infiere una sesión sin token.
 */
export function parseLoginResponse(body: unknown): LoginOutcome {
  const data = unwrapApiResponse(body)['data'];
  if (!object(data)) throw invalid();
  if (data['twoFactorRequired'] === true) {
    const challenge = data['preAuthChallenge'];
    const available = data['availableMethods'];
    if (typeof challenge !== 'string' || !CHALLENGE_SHAPE.test(challenge) || !object(available)) throw invalid();
    const methods = KNOWN_METHODS.filter((method) => available[method] === true);
    if (methods.length === 0) throw invalid();
    return { kind: 'two-factor', challenge: { preAuthChallenge: challenge, methods } };
  }
  return { kind: 'authenticated', session: parseJwtAuthResponse(data['jwtResponse']) };
}

export function parseTwoFactorVerifyResponse(body: unknown): AuthSession {
  return parseJwtAuthResponse(unwrapApiResponse(body)['data']);
}
