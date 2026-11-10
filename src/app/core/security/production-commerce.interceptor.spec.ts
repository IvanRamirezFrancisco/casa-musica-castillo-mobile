import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PRODUCTION_API_BASE_URL } from '../../../environments/environment-settings';
import { productionCommerceInterceptor } from './production-commerce.interceptor';

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
});
