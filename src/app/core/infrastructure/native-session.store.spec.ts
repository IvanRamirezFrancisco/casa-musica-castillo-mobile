import { Capacitor } from '@capacitor/core';
import { fakeJwt, testSession } from '../api/auth.testing';
import { readJwtExpiry } from '../security/jwt.util';
import { createSessionStore, NativeSessionStore, SESSION_KEY, SessionStorageError } from './native-session.store';

const api = 'https://api.example.test';
function fixture() {
  const token = fakeJwt();
  const session = testSession({ token, expiresAt: readJwtExpiry(token) });
  const storage = { getItem: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
    setItem: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    removeItem: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) };
  return { session, storage, store: new NativeSessionStore(storage, api) };
}
const envelope = (session: unknown, extra = {}) => JSON.stringify({ version: 1, api, session, ...extra });

describe('NativeSessionStore (puente controlado, no acredita cifrado Android)', () => {
  it('guarda una sola credencial ligada a la API y recupera la sesión después de recrear el adaptador', async () => {
    const { session, storage, store } = fixture();
    await store.save(session);
    const [key, value] = storage.setItem.mock.calls[0] as unknown as [string, string];
    expect(key).toBe(SESSION_KEY);
    storage.getItem.mockResolvedValue(value);
    await expect(new NativeSessionStore(storage, api).load()).resolves.toEqual(session);
    expect(store.persistent).toBe(true);
  });

  it('no persiste propiedades adicionales, contraseñas ni desafíos MFA', async () => {
    const { session, storage, store } = fixture();
    await store.save({ ...session, password: 'never-store', preAuthChallenge: 'never-store' } as typeof session);
    expect(JSON.stringify(storage.setItem.mock.calls)).not.toContain('never-store');
  });

  it('un almacén vacío equivale a instalación nueva', async () => {
    await expect(fixture().store.load()).resolves.toBeNull();
  });

  it.each([
    '{', 'null', '[]', envelope(null), envelope({}, { version: 99 }), envelope({}, { api: 'https://other.example.test' }),
  ])('descarta y elimina un registro corrupto o de otro entorno (%s)', async (raw) => {
    const { storage, store } = fixture(); storage.getItem.mockResolvedValue(raw);
    await expect(store.load()).rejects.toBeInstanceOf(SessionStorageError);
    expect(storage.removeItem).toHaveBeenCalledWith(SESSION_KEY);
  });

  it.each(['expired', 'missing-exp', 'identity', 'expiry', 'roles', 'token'])(
    'rechaza credenciales inválidas: %s', async (kind) => {
      const { session, storage, store } = fixture();
      const invalid = { ...session };
      if (kind === 'expired') { invalid.token = fakeJwt(1); invalid.expiresAt = 1000; }
      if (kind === 'missing-exp') { invalid.token = fakeJwt(null); invalid.expiresAt = null; }
      if (kind === 'identity') invalid.user = { ...invalid.user, id: 99 };
      if (kind === 'expiry') invalid.expiresAt = (invalid.expiresAt ?? 0) + 1000;
      if (kind === 'roles') invalid.user = { ...invalid.user, roles: [123 as unknown as string] };
      if (kind === 'token') invalid.token = 'not-a-token';
      storage.getItem.mockResolvedValue(envelope(invalid));
      if (kind === 'expired') await expect(store.load()).rejects.toMatchObject({ reason: 'expired' });
      else await expect(store.load()).rejects.toBeInstanceOf(SessionStorageError);
      expect(storage.removeItem).toHaveBeenCalled();
      await expect(store.save(invalid)).rejects.toBeInstanceOf(SessionStorageError);
      expect(storage.setItem).not.toHaveBeenCalled();
    });

  it('serializa un guardado lento antes del borrado; no resucita la sesión tras logout', async () => {
    const { session, storage, store } = fixture();
    let release!: () => void;
    storage.setItem.mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
    const save = store.save(session);
    const clear = store.clear();
    await Promise.resolve();
    expect(storage.removeItem).not.toHaveBeenCalled();
    release(); await Promise.all([save, clear]);
    expect(storage.removeItem).toHaveBeenCalledWith(SESSION_KEY);
    expect(storage.setItem.mock.invocationCallOrder[0]).toBeLessThan(storage.removeItem.mock.invocationCallOrder[0]);
  });

  it.each(['getItem', 'setItem', 'removeItem'] as const)('sanea errores de %s y permite operaciones posteriores', async (operation) => {
    const { session, storage, store } = fixture();
    storage[operation].mockRejectedValueOnce(new Error('private-token-or-device-details'));
    const result = operation === 'getItem' ? store.load() : operation === 'setItem' ? store.save(session) : store.clear();
    await expect(result).rejects.toThrow('No se pudo acceder al almacenamiento seguro de la sesión.');
    await expect(store.clear()).resolves.toBeUndefined();
  });

  it.each([
    { connected: false, native: true, platform: 'android' },
    { connected: true, native: false, platform: 'web' },
    { connected: true, native: true, platform: 'ios' },
  ])('DEMO, navegador e iOS usan memoria explícita ($platform, $connected)', async ({ connected, native, platform }) => {
    const { storage, session } = fixture();
    const host = { ...Capacitor, isNativePlatform: () => native, getPlatform: () => platform };
    const store = createSessionStore(connected, api, host, storage);
    await store.save(session); await store.load(); await store.clear();
    expect(store.persistent).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('Android conectado exige registro nativo, sin recurrir al adaptador web', async () => {
    const { storage, session } = fixture();
    const host = { ...Capacitor, isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => false };
    const store = createSessionStore(true, api, host, storage);
    expect(store.persistent).toBe(true);
    await expect(store.save(session)).rejects.toBeInstanceOf(SessionStorageError);
    await expect(store.load()).rejects.toBeInstanceOf(SessionStorageError);
    await expect(store.clear()).rejects.toBeInstanceOf(SessionStorageError);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('Android conectado registrado invoca solo el puente nativo', async () => {
    const { storage, session } = fixture();
    const host = { ...Capacitor, isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => true };
    const store = createSessionStore(true, api + '/', host, storage);
    await store.save(session);
    const [, value] = storage.setItem.mock.calls[0] as unknown as [string, string];
    storage.getItem.mockResolvedValue(value);
    await expect(store.load()).resolves.toEqual(session);
    await store.clear();
  });
});
