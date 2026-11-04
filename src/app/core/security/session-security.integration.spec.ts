import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiClientService } from '../api/api-client.service';
import { ApiError } from '../api/api-error';
import { fakeJwt, testSession } from '../api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../config/backend-session.token';
import { MemorySessionStore } from '../infrastructure/memory-session.store';
import { AuthService } from '../services/auth.service';
import { SESSION_STORE } from './session-store.token';
import { authGuard, safeReturnUrl } from './auth.guard';
import { authInterceptor } from './auth.interceptor';

const base = 'https://api.example.test';

function configure(enabled = true, store = new MemorySessionStore()) {
  TestBed.configureTestingModule({ providers: [
    provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: base }, { provide: SESSION_STORE, useValue: store },
    { provide: BACKEND_SESSION_ENABLED, useValue: enabled },
  ] });
  return { auth: TestBed.inject(AuthService), api: TestBed.inject(ApiClientService), http: TestBed.inject(HttpTestingController), store };
}

/** Integración de seguridad: interceptor + cliente HTTP + sesión + guard con HttpTestingController. */
describe('sesión, interceptor y guard (integración)', () => {
  it('adjunta Authorization solo a peticiones autenticadas y nunca a las públicas', async () => {
    const { auth, api, http, store } = configure();
    const session = testSession();
    await store.save(session);
    await auth.restore();
    api.get('/api/public/products/latest').subscribe();
    expect(http.expectOne(`${base}/api/public/products/latest`).request.headers.has('Authorization')).toBe(false);
    api.get('/api/cart', undefined, { auth: true }).subscribe();
    const secured = http.expectOne(`${base}/api/cart`);
    expect(secured.request.headers.get('Authorization')).toBe(`Bearer ${session.token}`);
    expect(secured.request.withCredentials).toBe(false);
    secured.flush({});
    http.verify();
  });

  it('no envía el JWT a un host distinto del backend configurado', async () => {
    const { auth, http, store } = configure();
    await store.save(testSession());
    await auth.restore();
    const error = vi.fn();
    const { REQUIRES_AUTH } = await import('../api/api-client.service');
    const { HttpContext } = await import('@angular/common/http');
    TestBed.inject(HttpClient).get('https://evil.example.test/steal', { context: new HttpContext().set(REQUIRES_AUTH, true) }).subscribe({ error });
    http.expectNone('https://evil.example.test/steal');
    expect(error).toHaveBeenCalled();
    http.verify();
  });

  it('con token vencido no realiza la petición y termina la sesión como 401', async () => {
    const { auth, api, http, store } = configure();
    await store.save(testSession({ token: fakeJwt(1), expiresAt: Date.now() - 1000 }));
    await auth.restore();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const error = vi.fn();
    api.get('/api/orders/my', undefined, { auth: true }).subscribe({ error });
    http.expectNone(`${base}/api/orders/my`);
    expect(error.mock.calls[0][0]).toEqual(expect.objectContaining({ status: 401 }));
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('sin sesión una petición autenticada falla localmente con 401', () => {
    const { api, http } = configure();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const error = vi.fn();
    api.get('/api/users/profile', undefined, { auth: true }).subscribe({ error });
    http.expectNone(`${base}/api/users/profile`);
    expect((error.mock.calls[0][0] as ApiError).isUnauthorized).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('un 401 del servidor limpia la sesión; un 403 la conserva', async () => {
    const { auth, api, http, store } = configure();
    await store.save(testSession());
    await auth.restore();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const forbidden = vi.fn();
    api.get('/api/orders/my/9', undefined, { auth: true }).subscribe({ error: forbidden });
    http.expectOne(`${base}/api/orders/my/9`).flush({ error: 'No tienes permiso' }, { status: 403, statusText: 'Forbidden' });
    expect(forbidden.mock.calls[0][0].isForbidden).toBe(true);
    expect(auth.hasValidSession()).toBe(true);

    const unauthorized = vi.fn();
    api.get('/api/orders/my', undefined, { auth: true }).subscribe({ error: unauthorized });
    http.expectOne(`${base}/api/orders/my`).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(unauthorized.mock.calls[0][0].isUnauthorized).toBe(true);
    expect(auth.hasValidSession()).toBe(false);
    expect(auth.sessionExpired()).toBe(true);
    await expect(store.load()).resolves.toBeNull();
  });

  it('POST, PUT y DELETE autenticados incluyen el cuerpo y el token', async () => {
    const { auth, api, http, store } = configure();
    await store.save(testSession());
    await auth.restore();
    api.post('/api/cart/items', { productId: 1, quantity: 2 }, { auth: true }).subscribe();
    api.put('/api/cart/items/5', { itemId: 5, quantity: 3 }, { auth: true }).subscribe();
    api.delete('/api/cart/items/5', { auth: true }).subscribe();
    for (const [method, url] of [['POST', '/api/cart/items'], ['PUT', '/api/cart/items/5'], ['DELETE', '/api/cart/items/5']]) {
      const req = http.expectOne((r) => r.method === method && r.url === `${base}${url}`);
      expect(req.request.method).toBe(method);
      expect(req.request.headers.has('Authorization')).toBe(true);
      req.flush({});
    }
  });

  describe('authGuard', () => {
    const run = (url: string) => TestBed.runInInjectionContext(() => authGuard({} as never, { url } as never));

    it('en configuración demo no exige sesión', async () => {
      configure(false);
      await expect(run('/main/cart')).resolves.toBe(true);
    });

    it('sin sesión redirige a login conservando una ruta interna segura', async () => {
      configure();
      const result = await run('/main/orders') as UrlTree;
      expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fmain%2Forders');
    });

    it('protege favoritos y conserva el destino solicitado para el invitado', async () => {
      configure();
      const result=await run('/favorites') as UrlTree;
      expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Ffavorites');
    });

    it('con sesión vigente permite el acceso', async () => {
      const { auth, store } = configure();
      await store.save(testSession());
      await expect(run('/main/profile')).resolves.toBe(true);
      expect(auth.user()).not.toBeNull();
    });

    it('una sesión restaurada pero vencida se descarta y redirige a login', async () => {
      const { auth, store } = configure();
      await store.save(testSession({ token: fakeJwt(1), expiresAt: Date.now() - 1000 }));
      await expect(run('/main/profile')).resolves.toBeInstanceOf(UrlTree);
      expect(auth.user()).toBeNull();
      expect(auth.sessionExpired()).toBe(true);
    });
  });

  it('safeReturnUrl rechaza redirecciones abiertas y valores no internos', () => {
    expect(safeReturnUrl('/main/cart')).toBe('/main/cart');
    for (const bad of ['//evil.test', 'https://evil.test', '/\\evil', 'javascript:alert(1)', '/ok://x', '/a\nb', 'main/home', 7, undefined, `/${'a'.repeat(300)}`]) {
      expect(safeReturnUrl(bad)).toBe('/main/home');
    }
    expect(safeReturnUrl('x', '/login')).toBe('/login');
  });

  it('el JWT viaja solo en el encabezado: nunca en la URL ni en el cuerpo del logout', async () => {
    const { auth, http, store } = configure();
    const session = testSession();
    await store.save(session);
    await auth.restore();
    auth.logout().subscribe();
    const req = http.expectOne(`${base}/api/auth/logout`);
    expect(req.request.urlWithParams).not.toContain(session.token);
    expect(JSON.stringify(req.request.body)).not.toContain(session.token);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${session.token}`);
    req.flush({ message: 'Sesión cerrada exitosamente' });
    expect(auth.user()).toBeNull();
  });
  it.each([200, 401])('una respuesta privada tardía (%i) se descarta sin cerrar la sesión posterior', async (status) => {
    const { auth, api, http, store } = configure();
    await store.save(testSession()); await auth.restore();
    const error = vi.fn(); const next = vi.fn();
    api.get('/api/users/profile', undefined, { auth: true }).subscribe({ error, next });
    const previous = http.expectOne(`${base}/api/users/profile`);
    auth.login({ email: 'b@example.test', password: 'test' }).subscribe();
    const token = fakeJwt(Math.floor(Date.now() / 1000) + 3600, { sub: '99' });
    http.expectOne(`${base}/api/auth/login`).flush({ success: true, data: { jwtResponse: { accessToken: token,
      user: { ...testSession().user, id: 99 } } } });
    previous.flush({ id: 7, email: 'previous@example.test' }, { status, statusText: status === 200 ? 'OK' : 'Unauthorized' });
    expect(next).not.toHaveBeenCalled(); expect(error).toHaveBeenCalled();
    expect(auth.user()?.id).toBe(99); expect(auth.validToken()).toBe(token); http.verify();
  });

});
