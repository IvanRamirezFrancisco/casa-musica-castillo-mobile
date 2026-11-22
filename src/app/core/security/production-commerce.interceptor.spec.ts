import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PRODUCTION_API_BASE_URL } from '../../../environments/environment-settings';
import { productionCommerceInterceptor, REVIEWED_COMMERCE } from './production-commerce.interceptor';
import { API_BASE_URL } from '../api/api-base-url.token';
import { describeApiError } from '../api/api-error-message';
import { ApiClientService, REQUIRES_AUTH } from '../api/api-client.service';

describe('Protección de operaciones comerciales en Production', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideHttpClient(withInterceptors([productionCommerceInterceptor])), provideHttpClientTesting(),
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('bloquea cambios y cotización antes del transporte al origen comercial', async () => {
    const http = TestBed.inject(HttpClient);
    for (const path of ['cart/items', 'checkout', 'checkout/price-preview', 'orders/1', 'wishlist', 'reviews', 'payments']) {
      const url = `${PRODUCTION_API_BASE_URL}/api/${path}`;
      await expect(firstValueFrom(http.post(url, {}))).rejects.toMatchObject({ status: 403 });
      TestBed.inject(HttpTestingController).expectNone(url);
    }
    await expect(firstValueFrom(http.delete(`${PRODUCTION_API_BASE_URL}/api/wishlist/1`))).rejects.toMatchObject({ status: 403 });
  });

  it('distingue un 403 local de un acceso denegado por el servidor', async () => {
    TestBed.overrideProvider(API_BASE_URL, { useValue: PRODUCTION_API_BASE_URL });
    const api = TestBed.inject(ApiClientService);
    const transport = TestBed.inject(HttpTestingController);
    const local = await firstValueFrom(api.post('/api/cart/items', { productId: 313, quantity: 1 }, { auth: true }))
      .catch((error: unknown) => error);
    expect(local).toMatchObject({ kind: 'operation-disabled', status: 403 });
    expect(describeApiError(local)).toContain('esta versión');
    transport.expectNone(`${PRODUCTION_API_BASE_URL}/api/cart/items`);

    const remote = firstValueFrom(api.get('/api/wishlist', undefined, { auth: true })).catch((error: unknown) => error);
    transport.expectOne(`${PRODUCTION_API_BASE_URL}/api/wishlist`).flush({}, { status: 403, statusText: 'Forbidden' });
    const denied = await remote;
    expect(denied).toMatchObject({ kind: 'http', status: 403 });
    expect(describeApiError(denied)).toBe('No tienes permiso para realizar esta acción.');
  });

  it('conserva las lecturas y el contrato de un origen aislado', async () => {
    const http = TestBed.inject(HttpClient);
    const transport = TestBed.inject(HttpTestingController);
    const production = `${PRODUCTION_API_BASE_URL}/api/cart`;
    const staging = 'https://isolated.example.test/api/cart/items';
    const read = firstValueFrom(http.get(production));
    const add = firstValueFrom(http.post(staging, {}));
    transport.expectOne({ url: production, method: 'GET' }).flush({});
    transport.expectOne({ url: staging, method: 'POST' }).flush({});
    await expect(Promise.all([read, add])).resolves.toEqual([{}, {}]);
  });

  it('habilita únicamente mutaciones exactas de carrito y favoritos marcadas para autenticación', async () => {
    TestBed.overrideProvider(REVIEWED_COMMERCE, { useValue: true });
    const http = TestBed.inject(HttpClient);
    const transport = TestBed.inject(HttpTestingController);
    const context = new HttpContext().set(REQUIRES_AUTH, true);
    for (const [method, path] of [
      ['POST', 'cart/items'], ['PUT', 'cart/items/1'], ['DELETE', 'cart/items/1'], ['DELETE', 'cart'],
      ['POST', 'wishlist'], ['DELETE', 'wishlist/2'], ['POST', 'checkout/price-preview'],
    ]) {
      const url = `${PRODUCTION_API_BASE_URL}/api/${path}`;
      const approved = firstValueFrom(http.request(method, url, { context }));
      transport.expectOne({ method, url }).flush({});
      await expect(approved).resolves.toEqual({});
      await expect(firstValueFrom(http.request(method, url))).rejects.toMatchObject({ status: 403 });
      transport.expectNone(url);
    }
    for (const [method, path] of [
      ['POST', 'checkout'], ['POST', 'payments'], ['POST', 'payments/preference'], ['POST', 'orders/1'], ['POST', 'reviews'],
      ['POST', 'cart/transfer'], ['POST', 'cart/coupon'], ['PUT', 'cart/items/0'],
      ['POST', '%63art/items'], ['POST', 'cart/items?extra=true'], ['DELETE', 'wishlist/1/extra'],
    ]) {
      const url = `${PRODUCTION_API_BASE_URL}/api/${path}`;
      await expect(firstValueFrom(http.request(method, url, { context }))).rejects.toMatchObject({ status: 403 });
      transport.expectNone(url);
    }
  });
});
