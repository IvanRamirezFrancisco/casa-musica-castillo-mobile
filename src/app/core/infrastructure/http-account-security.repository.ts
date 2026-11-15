import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { unwrapApiResponse } from '../api/auth.validation';
import { ApiError } from '../api/api-error';
export interface SecurityMethods { EMAIL: boolean; GOOGLE_AUTHENTICATOR: boolean; BACKUP_CODES: boolean; }
export interface TotpEnrollment { manualEntryKey: string; qrCode: string; }
export interface AccountSession {
  id: string;
  device: string;
  current: boolean;
  lastActivity?: string;
}
export type AccountDeletionStatus = 'RECEIVED' | 'REVIEW_REQUIRED' | 'COMPLETED';
export interface AccountDeletionReceipt {
  requestId: string;
  status: AccountDeletionStatus;
  receivedAt: string;
  completedAt: string | null;
}
export interface AccountDeletionPolicy {
  available: boolean;
  publicEmailRequestEnabled: boolean;
  automaticDeletionEnabled: boolean;
  supportEmail: string;
  tokenValidityMinutes: number;
  retentionPolicyVersion: string;
}
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T/;
const DELETION_STATUSES: ReadonlySet<string> = new Set(['RECEIVED', 'REVIEW_REQUIRED', 'COMPLETED']);
const invalid = () => new ApiError('invalid-response', 200);
function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value) && Number.isFinite(Date.parse(value));
}
export function parseAccountDeletionPolicy(raw: unknown): AccountDeletionPolicy {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw invalid();
  const data = raw as Record<string, unknown>;
  if (typeof data['available'] !== 'boolean') throw invalid();
  const publicEmailRequestEnabled = data['publicEmailRequestEnabled'];
  if (publicEmailRequestEnabled !== undefined && typeof publicEmailRequestEnabled !== 'boolean') throw invalid();
  const automaticDeletionEnabled = data['automaticDeletionEnabled'];
  if (automaticDeletionEnabled !== undefined && typeof automaticDeletionEnabled !== 'boolean') throw invalid();
  const supportEmail = data['supportEmail'];
  if (supportEmail !== undefined && (typeof supportEmail !== 'string' || !supportEmail.includes('@'))) throw invalid();
  const tokenValidityMinutes = data['tokenValidityMinutes'];
  if (
    tokenValidityMinutes !== undefined &&
    (typeof tokenValidityMinutes !== 'number' || !Number.isSafeInteger(tokenValidityMinutes) || tokenValidityMinutes <= 0)
  ) {
    throw invalid();
  }
  const retentionPolicyVersion = data['retentionPolicyVersion'];
  if (retentionPolicyVersion !== undefined && typeof retentionPolicyVersion !== 'string') throw invalid();
  return {
    available: data['available'],
    publicEmailRequestEnabled: publicEmailRequestEnabled === true,
    automaticDeletionEnabled: automaticDeletionEnabled === true,
    supportEmail: typeof supportEmail === 'string' ? supportEmail : 'soporte@casamusicacastillo.com',
    tokenValidityMinutes: typeof tokenValidityMinutes === 'number' ? tokenValidityMinutes : 30,
    retentionPolicyVersion: typeof retentionPolicyVersion === 'string' ? retentionPolicyVersion : 'v1',
  };
}
export function parseAccountDeletionReceipt(raw: unknown): AccountDeletionReceipt {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw invalid();
  const data = raw as Record<string, unknown>;
  const { requestId, status, receivedAt, completedAt } = data;
  if (
    typeof requestId !== 'string' ||
    !UUID_PATTERN.test(requestId) ||
    typeof status !== 'string' ||
    !DELETION_STATUSES.has(status) ||
    !isIsoTimestamp(receivedAt)
  ) {
    throw invalid();
  }
  if (completedAt !== undefined && completedAt !== null && !isIsoTimestamp(completedAt)) throw invalid();
  return {
    requestId,
    status: status as AccountDeletionStatus,
    receivedAt,
    completedAt: typeof completedAt === 'string' ? completedAt : null,
  };
}
export function securityData(raw: unknown): Record<string, unknown> {
  const data = unwrapApiResponse(raw)['data'];
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw invalid();
  return data as Record<string, unknown>;
}
@Injectable({ providedIn: 'root' })
export class HttpAccountSecurityRepository {
  private readonly api = inject(ApiClientService);
  passwordChangeRevokesSessions() {
    return this.api.get<unknown>('/api/users/security-settings', undefined, { auth: true })
      .pipe(map(raw => securityData(raw)['passwordChangeRevokesSessions'] === true));
  }
  availableBackupCodes() {
    return this.api.get<unknown>('/api/2fa/backup-codes/status', undefined, { auth: true }).pipe(map(raw => {
      const available = securityData(raw)['available'];
      if (typeof available !== 'number' || !Number.isSafeInteger(available) || available < 0) throw invalid();
      return available;
    }));
  }
  changePassword(currentPassword: string, newPassword: string) {
    return this.action('/api/users/change-password', { currentPassword, newPassword });
  }
  sessions() {
    return this.api.get<unknown>('/api/auth/sessions', undefined, { auth: true }).pipe(map(raw => {
      const list: unknown = securityData(raw)['sessions'];
      if (!Array.isArray(list)) throw invalid();
      return list.map((entry: unknown): AccountSession => {
        if (!entry || typeof entry !== 'object') throw invalid();
        const { id, deviceInfo, isCurrent, lastActivity } = entry as Record<string, unknown>;
        if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id) ||
            typeof deviceInfo !== 'string' || typeof isCurrent !== 'boolean') throw invalid();
        const hasActivity = typeof lastActivity === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(lastActivity) &&
          Number.isFinite(Date.parse(lastActivity));
        return { id, device: deviceInfo, current: isCurrent, ...(hasActivity ? { lastActivity } : {}) };
      });
    }));
  }
  revokeSession(id: string) {
    return this.api.delete<unknown>(`/api/auth/sessions/${encodeURIComponent(id)}`, { auth: true });
  }
  methods() { return this.api.get<unknown>('/api/2fa/methods', undefined, { auth: true }).pipe(map(raw => {
    const d = securityData(raw);
    if (['EMAIL', 'GOOGLE_AUTHENTICATOR', 'BACKUP_CODES'].some(k => typeof d[k] !== 'boolean')) throw invalid();
    return { EMAIL: d['EMAIL'] as boolean, GOOGLE_AUTHENTICATOR: d['GOOGLE_AUTHENTICATOR'] as boolean, BACKUP_CODES: d['BACKUP_CODES'] as boolean };
  })); }
  setup() { return this.api.post<unknown>('/api/2fa/google/setup', {}, { auth: true }).pipe(map(raw => {
    const d = securityData(raw);
    if (typeof d['manualEntryKey'] !== 'string' || !/^[A-Z2-7]{16,128}$/.test(d['manualEntryKey']) || typeof d['qrCode'] !== 'string'
      || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d['qrCode']) || d['qrCode'].length > 1000000) throw invalid();
    return { manualEntryKey: d['manualEntryKey'], qrCode: d['qrCode'] } as TotpEnrollment;
  })); }
  confirm(code: string) { return this.action('/api/2fa/google/confirm', { code }); }
  email(enabled: boolean, currentPassword?: string) {
    return enabled
      ? this.action('/api/2fa/email/enable')
      : this.action('/api/2fa/email/disable', { currentPassword: currentPassword ?? '' });
  }
  disableTotp(currentPassword: string) { return this.action('/api/2fa/google/disable', { currentPassword }); }
  generate(currentPassword: string) { return this.api.post<unknown>('/api/2fa/backup-codes/generate', { currentPassword }, { auth: true }).pipe(map(raw => {
    const d = securityData(raw); const codes = d['codes'];
    if (d['count'] !== 10 || !Array.isArray(codes) || codes.length !== 10 || !codes.every(c => typeof c === 'string' && /^\d{4}-\d{4}$/.test(c)) || new Set(codes).size !== 10) throw invalid();
    return codes as string[];
  })); }
  disableBackupCodes(currentPassword: string) { return this.action('/api/2fa/backup-codes/disable', { currentPassword }); }
  deletionAvailability() {
    return this.api.get<unknown>('/api/public/legal/deletion').pipe(map(parseAccountDeletionPolicy));
  }
  ownDeletionRequest() {
    return this.api.get<unknown>('/api/users/me/deletion-requests', undefined, { auth: true }).pipe(map(parseAccountDeletionReceipt));
  }
  requestAccountDeletion(currentPassword: string, confirmed: boolean) {
    return this.api.post<unknown>('/api/users/me/deletion-requests', { currentPassword, confirmed }, { auth: true })
      .pipe(map(parseAccountDeletionReceipt));
  }
  trackAccountDeletion(requestId: string) {
    return this.api.post<unknown>('/api/public/legal/deletion/status', { requestId: requestId.trim() })
      .pipe(map(parseAccountDeletionReceipt));
  }
  private action(path: `/api/${string}`, body: object = {}) {
    return this.api.post<unknown>(path, body, { auth: true }).pipe(map(raw => { unwrapApiResponse(raw); }));
  }
}
