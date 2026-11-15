import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PRODUCTION_API_BASE_URL } from '../../../environments/environment-settings';
import { REQUIRES_AUTH } from '../api/api-client.service';
import { PUBLIC_DEMO } from '../config/public-demo.token';
import { CONNECTED_QA } from '../config/connected-qa.token';
import { publicDemoInterceptor } from './public-demo.interceptor';

describe.each(['Public Demo', 'Connected QA'])('%s HTTP policy', (mode) => {
  const catalog = `${PRODUCTION_API_BASE_URL}/api/public/products/catalog?page=0`;
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([publicDemoInterceptor])), provideHttpClientTesting(),
      { provide: PUBLIC_DEMO, useValue: mode === 'Public Demo' },
      { provide: CONNECTED_QA, useValue: mode === 'Connected QA' },
    ] });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());

  it('forwards public GET without credentials or redirects', async () => {
    const response = firstValueFrom(http.get(catalog, { withCredentials: true }));
    const request = backend.expectOne(catalog);
    expect(request.request.credentials).toBe('omit');
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.redirect).toBe('error');
    request.flush({ content: [] });
    await expect(response).resolves.toEqual({ content: [] });
  });

  it('blocks writes, private reads, authentication and other origins before transport', async () => {
    for (const call of [
      http.post(`${PRODUCTION_API_BASE_URL}/api/auth/login`, {}),
      http.post(catalog, {}),
      http.get(`${PRODUCTION_API_BASE_URL}/api/reviews/product/12/eligibility`),
      http.get(catalog, { context: new HttpContext().set(REQUIRES_AUTH, true) }),
      http.get(catalog, { headers: { Authorization: 'test-only' } }),
      http.get('https://elsewhere.example/api/public/products/catalog'),
    ]) {
      await expect(firstValueFrom(call)).rejects.toMatchObject({ status: 403 });
    }
    backend.expectNone(() => true);
  });
});
