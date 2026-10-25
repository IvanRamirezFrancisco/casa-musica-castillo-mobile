import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-base-url.token';
import { ApiConnectivityService } from './api-connectivity.service';
import { PublicCategory } from './public-category.model';

describe('ApiConnectivityService (HTTP simulado, sin Internet)', () => {
  let service: ApiConnectivityService;
  let http: HttpTestingController;
  const url = 'https://api.example.test/api/public/categories/active';
  const category: PublicCategory = {
    id: 1, name: 'Guitarras', description: null, imageUrl: null,
    parentId: null, parentName: null, activeProductCount: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: 'https://api.example.test' },
    ] });
    service = TestBed.inject(ApiConnectivityService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('comprueba el GET público real y admite los campos anulables del DTO', () => {
    const next = vi.fn();
    service.check().subscribe(next);
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush([category, { ...category, id: 2, parentId: 1, parentName: 'Guitarras', imageUrl: '/uploads/test.png', description: 'Texto' }]);
    expect(next).toHaveBeenCalledWith(2);
  });

  it('considera una lista vacía una conexión correcta', () => {
    const next = vi.fn();
    service.check().subscribe(next);
    http.expectOne(url).flush([]);
    expect(next).toHaveBeenCalledWith(0);
  });

  for (const body of [{ content: [category] }, [{ id: 1 }], [{ ...category, parentId: '1' }], [{ ...category, activeProductCount: null }]]) {
    it(`rechaza HTTP 200 incompatible: ${JSON.stringify(body)}`, () => {
      const error = vi.fn();
      service.check().subscribe({ error });
      http.expectOne(url).flush(body);
      expect(error.mock.calls[0][0]).toMatchObject({ kind: 'invalid-response', status: 200 });
    });
  }

  it('propaga el fallo de servidor sin reintentos automáticos', () => {
    const error = vi.fn();
    service.check().subscribe({ error });
    http.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });
    expect(error.mock.calls[0][0]).toMatchObject({ kind: 'http', status: 500 });
    http.expectNone(url);
  });
});
