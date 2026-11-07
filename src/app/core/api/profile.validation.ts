import type { UserProfile } from '../models/profile.model';
import { ApiError } from './api-error';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const invalid = (): ApiError => new ApiError('invalid-response', 200);

const readOptString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw invalid();
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const readOptBool = (value: unknown, fallback = false): boolean => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') throw invalid();
  return value;
};

/** Valida `ApiResponse<Map<String, Object>>` de `GET /api/users/profile`. */
export const parseUserProfile = (body: unknown): UserProfile => {
  if (!isRecord(body) || body['success'] !== true || !isRecord(body['data'])) {
    throw invalid();
  }
  const data = body['data'];
  const id = data['id'];
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) throw invalid();
  const firstName = readOptString(data['firstName']);
  const lastName = readOptString(data['lastName']);
  const email = readOptString(data['email']);
  if (!firstName || !lastName || !email || !email.includes('@')) throw invalid();

  return {
    id,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email,
    phone: readOptString(data['phone']),
    enabled: readOptBool(data['enabled'], true),
    twoFactorEnabled: readOptBool(data['twoFactorEnabled'], false),
    emailTwoFactorEnabled: readOptBool(data['emailEnabled'], false),
    totpEnabled: readOptBool(data['googleAuthEnabled'], false),
    backupCodesEnabled: readOptBool(data['backupCodesEnabled'], false),
    createdAt: readOptString(data['createdAt']),
    updatedAt: readOptString(data['updatedAt']),
  };
};
