import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { unwrapApiResponse } from '../api/auth.validation';
import { ApiError } from '../api/api-error';
export interface SecurityMethods { EMAIL: boolean; GOOGLE_AUTHENTICATOR: boolean; BACKUP_CODES: boolean; }
export interface TotpEnrollment { manualEntryKey: string; qrCode: string; }
const invalid = () => new ApiError('invalid-response', 200);
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
  private action(path: `/api/${string}`, body: object = {}) {
    return this.api.post<unknown>(path, body, { auth: true }).pipe(map(raw => { unwrapApiResponse(raw); }));
  }
}
