import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiClientService } from '../api/api-client.service';
import { fakeJwt, testSession, userDto } from '../api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../config/backend-session.token';
import {
  EncryptedStorage,
  NativeSessionStore,
  SESSION_KEY,
  SessionStorageError,
} from '../infrastructure/native-session.store';
import { authInterceptor } from './auth.interceptor';
import { readJwtExpiry } from './jwt.util';
import { SESSION_STORE } from './session-store.token';
import { WEB_COOKIE_REFRESH_ENABLED } from './web-cookie-refresh.token';
import { AuthService } from '../services/auth.service';
import { GOOGLE_CREDENTIAL_PLUGIN, GoogleCredentialPlugin } from '../services/google-identity.service';

const base = 'https://api.example.test';
const EXPIRED_EXP = Math.floor(Date.now() / 1000) - 600;
const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;

function createInMemoryEncryptedStorage(): EncryptedStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
  };
}

async function waitForOneRequest(
  http: HttpTestingController,
  matcher: string | ((req: TestRequest['request']) => boolean),
): Promise<TestRequest> {
  let matchedReq!: TestRequest;
  await vi.waitFor(() => {
    const reqs = typeof matcher === 'string' ? http.match(matcher) : http.match(matcher);
    if (reqs.length === 1) matchedReq = reqs[0];
    expect(reqs.length).toBe(1);
  });
  return matchedReq;
}

describe('Persistencia de sesiones, rotación de refresh tokens y single-flight (integración)', () => {
  let http: HttpTestingController | null = null;
  let storage: ReturnType<typeof createInMemoryEncryptedStorage>;
  let nativeCredentialPlugin: { [K in keyof GoogleCredentialPlugin]: ReturnType<typeof vi.fn> };

  afterEach(() => {
    http?.verify();
    http = null;
    vi.restoreAllMocks();
  });

  function setupAndroid() {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    storage = createInMemoryEncryptedStorage();
    const store = new NativeSessionStore(storage, base);
    nativeCredentialPlugin = {
      signIn: vi.fn(),
      clearCredentialState: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: base },
        { provide: BACKEND_SESSION_ENABLED, useValue: true },
        { provide: WEB_COOKIE_REFRESH_ENABLED, useValue: false },
        { provide: SESSION_STORE, useValue: store },
        { provide: GOOGLE_CREDENTIAL_PLUGIN, useValue: nativeCredentialPlugin },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    return {
      auth: TestBed.inject(AuthService),
      api: TestBed.inject(ApiClientService),
      router: TestBed.inject(Router),
      store,
    };
  }

  it('Android NativeSessionStore permite cargar access JWT expirado si existe refreshToken cifrado y limpia corrupción', async () => {
    storage = createInMemoryEncryptedStorage();
    const store = new NativeSessionStore(storage, base);
    const expiredJwt = fakeJwt(EXPIRED_EXP);
    const expiredWithRefresh = testSession({
      token: expiredJwt,
      expiresAt: readJwtExpiry(expiredJwt),
      refreshToken: 'refresh-android-valid-token-123456789012',
    });

    // Save rejects expired JWT; simulate previously stored valid session whose access JWT later expired
    await expect(store.save(expiredWithRefresh)).rejects.toMatchObject({ reason: 'expired' });
    await storage.setItem(SESSION_KEY, JSON.stringify({ version: 1, api: base, session: expiredWithRefresh }));
    const loaded = await store.load();
    expect(loaded?.refreshToken).toBe('refresh-android-valid-token-123456789012');

    // Without refreshToken, expired JWT on load throws 'expired' and wipes storage
    const expiredWithoutRefresh = testSession({ token: expiredJwt, expiresAt: readJwtExpiry(expiredJwt) });
    await storage.setItem(SESSION_KEY, JSON.stringify({ version: 1, api: base, session: expiredWithoutRefresh }));
    await expect(store.load()).rejects.toMatchObject({ reason: 'expired' });
    expect(storage.map.has(SESSION_KEY)).toBe(false);

    // Corrupted JSON removes encrypted key cleanly
    storage.map.set(SESSION_KEY, '{corrupted');
    await expect(store.load()).rejects.toBeInstanceOf(SessionStorageError);
    expect(storage.map.has(SESSION_KEY)).toBe(false);
  });

  it('Android restaura sesión renovando access JWT expirado en startup y conserva keystore ante fallo offline/500', async () => {
    const { auth, store } = setupAndroid();
    const expiredJwt = fakeJwt(EXPIRED_EXP);
    const persisted = testSession({
      token: expiredJwt,
      expiresAt: readJwtExpiry(expiredJwt),
      refreshToken: 'android-stored-refresh-token-1234567890',
    });
    await storage.setItem(SESSION_KEY, JSON.stringify({ version: 1, api: base, session: persisted }));

    const offlineAttempt = auth.restore();
    const offlineReq = await waitForOneRequest(http!, `${base}/api/auth/session/refresh`);
    offlineReq.flush({}, { status: 503, statusText: 'Unavailable' });
    await offlineAttempt;
    expect(auth.user()).toBeNull();
    expect(storage.map.has(SESSION_KEY)).toBe(true);

    const rotatedJwt = fakeJwt(FUTURE_EXP);
    const restorePromise = auth.restore();
    const refreshReq = await waitForOneRequest(http!, `${base}/api/auth/session/refresh`);
    expect(refreshReq.request.headers.get('X-Client-Platform')).toBe('android');
    expect(refreshReq.request.body).toEqual({ refreshToken: 'android-stored-refresh-token-1234567890' });
    refreshReq.flush({
      success: true,
      message: 'ok',
      data: {
        accessToken: rotatedJwt,
        refreshToken: 'android-rotated-refresh-token-987654321',
        tokenType: 'Bearer',
        user: { ...userDto(), roles: ['ROLE_USER'] },
      },
    });
    await restorePromise;

    expect(auth.hasValidSession()).toBe(true);
    expect(auth.validToken()).toBe(rotatedJwt);
    const saved = await store.load();
    expect(saved?.refreshToken).toBe('android-rotated-refresh-token-987654321');
  });

  it('si /api/auth/session/refresh responde 401 revoca almacén nativo, marca sesión expirada y redirige a /login', async () => {
    const { auth, api, store, router } = setupAndroid();
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const tokenV1 = fakeJwt(FUTURE_EXP);
    await store.save(
      testSession({
        token: tokenV1,
        expiresAt: readJwtExpiry(tokenV1),
        refreshToken: 'refresh-revoked-1234567890123456',
      }),
    );
    const r = auth.restore();
    const meReq = await waitForOneRequest(http!, `${base}/api/auth/me`);
    meReq.flush({ ...userDto(), roles: ['ROLE_USER'] });
    await r;

    const failedCall = firstValueFrom(api.get('/api/users/me', undefined, { auth: true })).catch((e: unknown) => e);
    const firstMe = await waitForOneRequest(http!, `${base}/api/users/me`);
    firstMe.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = await waitForOneRequest(http!, `${base}/api/auth/session/refresh`);
    refreshReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    await failedCall;
    expect(storage.map.has(SESSION_KEY)).toBe(false);
    expect(auth.sessionExpired()).toBe(true);
    expect(auth.hasValidSession()).toBe(false);
    expect(navSpy).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('interceptor reintenta una sola vez con token rotado en peticiones autenticadas concurrentes (single-flight)', async () => {
    const { auth, api, store, router } = setupAndroid();
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const tokenV1 = fakeJwt(FUTURE_EXP, { jti: 'old-jti' });
    await store.save(
      testSession({
        token: tokenV1,
        expiresAt: readJwtExpiry(tokenV1),
        refreshToken: 'refresh-single-flight-1234567890123456',
      }),
    );
    const r = auth.restore();
    const initMe = await waitForOneRequest(http!, `${base}/api/auth/me`);
    initMe.flush({ ...userDto(), roles: ['ROLE_USER'] });
    await r;

    const reqA = firstValueFrom(api.get('/api/users/me', undefined, { auth: true }));
    const reqB = firstValueFrom(api.get('/api/users/security-settings', undefined, { auth: true }));

    const r1 = await waitForOneRequest(http!, `${base}/api/users/me`);
    const r2 = await waitForOneRequest(http!, `${base}/api/users/security-settings`);
    r1.flush({}, { status: 401, statusText: 'Unauthorized' });
    r2.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = await waitForOneRequest(http!, `${base}/api/auth/session/refresh`);
    const tokenV2 = fakeJwt(FUTURE_EXP, { jti: 'new-jti' });
    refreshReq.flush({
      success: true,
      message: 'ok',
      data: {
        accessToken: tokenV2,
        refreshToken: 'refresh-single-flight-rotated-9876543210',
        tokenType: 'Bearer',
        user: { ...userDto(), roles: ['ROLE_USER'] },
      },
    });

    const retry1 = await waitForOneRequest(
      http!,
      (req) => req.url === `${base}/api/users/me` && req.headers.get('Authorization') === `Bearer ${tokenV2}`,
    );
    const retry2 = await waitForOneRequest(
      http!,
      (req) => req.url === `${base}/api/users/security-settings` && req.headers.get('Authorization') === `Bearer ${tokenV2}`,
    );
    retry1.flush({ ok: 'me' });
    retry2.flush({ ok: 'sec' });

    await expect(reqA).resolves.toEqual({ ok: 'me' });
    await expect(reqB).resolves.toEqual({ ok: 'sec' });
    expect(navSpy).not.toHaveBeenCalled();

    const logoutDone = firstValueFrom(auth.logout());
    const outReq = await waitForOneRequest(http!, `${base}/api/auth/logout`);
    expect(outReq.request.headers.get('X-Client-Platform')).toBe('android');
    expect(outReq.request.body).toEqual({ refreshToken: 'refresh-single-flight-rotated-9876543210' });
    outReq.flush({ success: true, message: 'ok' });
    await logoutDone;
    expect(storage.map.has(SESSION_KEY)).toBe(false);
    expect(nativeCredentialPlugin.clearCredentialState).toHaveBeenCalledOnce();
  });

  it('Web con cookie HttpOnly renueva silenciosamente sin guardar tokens en localStorage y no marca expiración si anónimo recibe 401', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('web');

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: base },
        { provide: BACKEND_SESSION_ENABLED, useValue: true },
        { provide: WEB_COOKIE_REFRESH_ENABLED, useValue: true },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);

    const anonRestore = auth.restore();
    const anonReq = await waitForOneRequest(http, `${base}/api/auth/session/refresh`);
    expect(anonReq.request.withCredentials).toBe(true);
    expect(anonReq.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(anonReq.request.body).toEqual({});
    anonReq.flush({}, { status: 401, statusText: 'Unauthorized' });
    await anonRestore;
    expect(auth.sessionExpired()).toBe(false);
    expect(auth.hasValidSession()).toBe(false);

    const webToken = fakeJwt(FUTURE_EXP);
    const validRestore = auth.restore();
    const validReq = await waitForOneRequest(http, `${base}/api/auth/session/refresh`);
    validReq.flush({
      success: true,
      message: 'ok',
      data: {
        accessToken: webToken,
        tokenType: 'Bearer',
        user: { ...userDto(), roles: ['ROLE_USER'], googleLinked: true, hasLocalPassword: false },
      },
    });
    await validRestore;
    expect(auth.hasValidSession()).toBe(true);
    expect(auth.persistent).toBe(false);
  });
});
