import { provideHttpClient, HttpParams } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-base-url.token';
import { ApiClientService } from './api-client.service';
import { ApiError } from './api-error';

describe('ApiClientService', () => {
  let service: ApiClientService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: 'https://api.example.test/' },
    ] });
    service = TestBed.inject(ApiClientService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('usa la base inyectada, normaliza la barra y transmite parámetros sin sesión', () => {
    const next = vi.fn();
    service.get<readonly string[]>('/api/public/categories/active', new HttpParams().set('withProducts', true)).subscribe(next);
    const request = http.expectOne('https://api.example.test/api/public/categories/active?withProducts=true');
    expect(request.request.method).toBe('GET');
    expect(request.request.credentials).toBe('omit');
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.timeout).toBe(60_000);
    request.flush([]);
    expect(next).toHaveBeenCalledWith([]);
  });

  it('no solicita nada hasta la suscripción', () => {
    service.get('/api/public/categories/active');
    http.expectNone(() => true);
  });

  it('expone un error técnico de red sin atribuirlo únicamente a CORS', () => {
    const error = vi.fn();
    service.get('/api/public/categories/active').subscribe({ error });
    http.expectOne(() => true).error(new ProgressEvent('error'));
    expect(error.mock.calls[0][0]).toMatchObject({ kind: 'connection', status: 0 });
    expect(error.mock.calls[0][0]).toBeInstanceOf(ApiError);
  });

  it('conserva el status HTTP y no expone el cuerpo interno del servidor', () => {
    const error = vi.fn();
    service.get('/api/public/categories/active').subscribe({ error });
    http.expectOne(() => true).flush({ trace: 'internal detail' }, { status: 503, statusText: 'Unavailable' });
    expect(error.mock.calls[0][0]).toMatchObject({ kind: 'http', status: 503 });
    expect(error.mock.calls[0][0].message).not.toContain('internal detail');
    http.expectNone(() => true);
  });

  it('clasifica el evento timeout como fallo de conexión', () => {
    const error = vi.fn();
    service.get('/api/public/categories/active').subscribe({ error });
    http.expectOne(() => true).error(new ProgressEvent('timeout'));
    expect(error.mock.calls[0][0]).toMatchObject({ kind: 'connection', status: 0 });
  });
});
