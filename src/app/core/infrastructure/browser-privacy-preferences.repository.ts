import { Injectable, InjectionToken, inject } from '@angular/core';
import type { PrivacyPreferencesRepository } from '../repositories/privacy-preferences.repository';

export const PRIVACY_PREFERENCE_KEY = 'cmc.privacy.presentation.v1';
export const PRIVACY_PREFERENCE_STORAGE = new InjectionToken<Pick<Storage, 'getItem' | 'setItem'>>('PRIVACY_PREFERENCE_STORAGE', {
  providedIn: 'root',
  factory: () => ({ getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) }),
});
@Injectable({ providedIn: 'root' })
export class BrowserPrivacyPreferencesRepository implements PrivacyPreferencesRepository {
  private readonly storage = inject(PRIVACY_PREFERENCE_STORAGE);
  readHideContact(): boolean {
    const raw = this.storage.getItem(PRIVACY_PREFERENCE_KEY);
    if (raw === null) return false;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 2 ||
        !('version' in value) || value.version !== 1 || !('hideContact' in value) || typeof value.hideContact !== 'boolean') {
      throw new Error('Invalid privacy presentation preference.');
    }
    return value.hideContact;
  }
  saveHideContact(value: boolean): void {
    if (typeof value !== 'boolean') throw new Error('Invalid privacy presentation preference.');
    this.storage.setItem(PRIVACY_PREFERENCE_KEY, JSON.stringify({ version: 1, hideContact: value }));
    if (this.readHideContact() !== value) throw new Error('Privacy preference persistence could not be confirmed.');
  }
}
