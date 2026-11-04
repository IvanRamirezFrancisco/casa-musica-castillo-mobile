import { InjectionToken, inject } from '@angular/core';
import { BrowserPrivacyPreferencesRepository } from '../infrastructure/browser-privacy-preferences.repository';

/** Device-wide presentation setting; never business consent or account data. */
export interface PrivacyPreferencesRepository {
  readHideContact(): boolean;
  saveHideContact(value: boolean): void;
}
export const PRIVACY_PREFERENCES_REPOSITORY = new InjectionToken<PrivacyPreferencesRepository>('PRIVACY_PREFERENCES_REPOSITORY', {
  providedIn: 'root', factory: () => inject(BrowserPrivacyPreferencesRepository),
});
