import { InjectionToken } from '@angular/core';
import type { SessionStore } from '../models/auth.model';
import { MemorySessionStore } from '../infrastructure/memory-session.store';

/**
 * Punto de sustitución para TT-05. Cuando exista una implementación nativa segura
 * (Keystore/EncryptedSharedPreferences), solo cambia este provider.
 */
export const SESSION_STORE = new InjectionToken<SessionStore>('SESSION_STORE', {
  providedIn: 'root',
  factory: () => new MemorySessionStore(),
});
