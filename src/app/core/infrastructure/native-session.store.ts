import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { readJwtExpiry } from '../security/jwt.util';
import { parseJwtAuthResponse } from '../api/auth.validation';
import type { AuthSession, SessionStore } from '../models/auth.model';
import { MemorySessionStore } from './memory-session.store';

export interface EncryptedStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export const SESSION_KEY = 'cmc.session.v1';

/** Never exposes platform errors, which may contain private data. */
export class SessionStorageError extends Error {
  constructor(readonly reason: 'storage' | 'expired' = 'storage') {
    super(reason === 'expired' ? 'La sesión expiró.' : 'No se pudo acceder al almacenamiento seguro de la sesión.');
  }
}

/** Android AES-GCM/Keystore only. The plugin's plaintext web implementation is never selected. */
export class NativeSessionStore implements SessionStore {
  readonly persistent = true;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: EncryptedStorage, private readonly api: string) {}

  save(session: AuthSession): Promise<void> {
    return this.serial(async () => {
      const safe = this.validate(session);
      await this.storage.setItem(SESSION_KEY, JSON.stringify({ version: 1, api: this.api, session: safe }));
    });
  }

  load(): Promise<AuthSession | null> {
    return this.serial(async () => {
      try {
        const raw = await this.storage.getItem(SESSION_KEY);
        if (raw === null) return null;
        const value = JSON.parse(raw) as { version?: unknown; api?: unknown; session?: AuthSession };
        if (!value || value.version !== 1 || value.api !== this.api || !value.session) throw new SessionStorageError();
        return this.validate(value.session);
      } catch (error) {
        await this.storage.removeItem(SESSION_KEY);
        throw error instanceof SessionStorageError ? error : new SessionStorageError();
      }
    });
  }

  clear(): Promise<void> { return this.serial(() => this.storage.removeItem(SESSION_KEY)); }

  private validate(value: AuthSession): AuthSession {
    const expiry = readJwtExpiry(value.token);
    if (expiry !== null && expiry <= Date.now()) throw new SessionStorageError('expired');
    const parsed = parseJwtAuthResponse({ accessToken: value.token, user: value.user, tokenType: 'Bearer' });
    if (value.expiresAt !== parsed.expiresAt) throw new SessionStorageError();
    return parsed;
  }

  /** A delayed write must finish before logout removes its key. Failed operations do not poison the queue. */
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation).catch((error: unknown) => { throw error instanceof SessionStorageError ? error : new SessionStorageError(); });
    this.queue = result.catch(() => undefined);
    return result;
  }
}

export function createSessionStore(connected: boolean, api: string,
  platform = Capacitor, storage: EncryptedStorage = SecureStorage): SessionStore {
  if (!connected || !platform.isNativePlatform() || platform.getPlatform() !== 'android') return new MemorySessionStore();
  // Missing native registration is an error, never permission to use the plugin's web fallback.
  const available = (): void => { if (!platform.isPluginAvailable('SecureStorage')) throw new SessionStorageError(); };
  return new NativeSessionStore({
    getItem: (key) => { available(); return storage.getItem(key); },
    setItem: (key, value) => { available(); return storage.setItem(key, value); },
    removeItem: (key) => { available(); return storage.removeItem(key); },
  }, api.replace(/\/+$/, ''));
}
