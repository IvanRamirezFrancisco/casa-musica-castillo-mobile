import type { AuthSession, SessionStore } from '../models/auth.model';

/**
 * Almacén VOLÁTIL: la sesión vive solo en la memoria del proceso y se pierde al cerrar la app.
 * Se utiliza en navegador y DEMO. Nunca usa localStorage/sessionStorage/Preferences.
 */
export class MemorySessionStore implements SessionStore {
  readonly persistent = false;
  private current: AuthSession | null = null;

  async save(session: AuthSession): Promise<void> {
    this.current = session;
  }

  async load(): Promise<AuthSession | null> {
    return this.current;
  }

  async clear(): Promise<void> {
    this.current = null;
  }
}
