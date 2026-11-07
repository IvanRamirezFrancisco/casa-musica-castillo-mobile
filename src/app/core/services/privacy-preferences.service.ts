import { Injectable, inject, signal } from '@angular/core';
import { PRIVACY_PREFERENCES_REPOSITORY } from '../repositories/privacy-preferences.repository';

@Injectable({ providedIn: 'root' })
export class PrivacyPreferencesService {
  private readonly repository = inject(PRIVACY_PREFERENCES_REPOSITORY);
  private readonly hidden = signal(false);
  readonly hideContact = this.hidden.asReadonly();
  readonly message = signal('');
  readonly storageError = signal(false);
  constructor() { this.reload(); }
  reload(): void {
    try {
      this.hidden.set(this.repository.readHideContact());
      this.storageError.set(false); this.message.set('');
    } catch { this.reportFailure(); }
  }
  setHideContact(value: boolean): void {
    try {
      this.repository.saveHideContact(value);
      this.hidden.set(value); this.storageError.set(false);
      this.message.set('Preferencia guardada en este dispositivo.');
    } catch { this.reportFailure(); }
  }
  private reportFailure(): void {
    this.storageError.set(true);
    this.message.set('No pudimos confirmar la preferencia guardada. Reintenta cuando el almacenamiento esté disponible.');
  }
}
