import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpPublicCatalogRepository } from './http-public-catalog.repository';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiError } from '../api/api-error';
import { categoryDto, productDto, productPage } from '../api/public-catalog.testing';

describe('HTTP public repository', () => {
  let repo: HttpPublicCatalogRepository; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://localhost:8080' }] });
    repo = TestBed.inject(HttpPublicCatalogRepository); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('encodes search/category/sort/page and sends no credentials or authorization', () => {
    repo.catalog({ keyword: '  guitarra & <script>  ', categoryId: 20, page: 2, size: 4, sortBy: 'price_asc' }).subscribe(page => expect(page.number).toBe(2));
    const req = http.expectOne(r => r.url.endsWith('/catalog'));
    expect(req.request.method).toBe('GET'); expect(req.request.credentials).toBe('omit');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.params.get('keyword')).toBe('guitarra & <script>');
    expect(req.request.params.get('categoryId')).toBe('20'); expect(req.request.params.get('sortBy')).toBe('price_asc');
    expect(req.request.params.get('page')).toBe('2'); expect(req.request.params.get('size')).toBe('4');
    req.flush(productPage([], { number: 2, size: 4 }));
  });
  it('clamps pagination, trims max search length and skips empty search', () => {
    repo.catalog({ page: -5, size: 999, keyword: ' ' }).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/catalog'));
    expect(req.request.params.get('page')).toBe('0'); expect(req.request.params.get('size')).toBe('50');
    expect(req.request.params.has('keyword')).toBe(false); req.flush(productPage([], { size: 50 }));
    repo.catalog({ page: NaN, size: NaN, keyword: 'x'.repeat(150) }).subscribe();
    const next = http.expectOne(r => r.url.endsWith('/catalog'));
    expect(next.request.params.get('keyword')?.length).toBe(100);
    expect(next.request.params.get('size')).toBe('12'); next.flush(productPage([]));
  });
  it('loads categories, latest, featured page and product by the original real ID', () => {
    repo.categories().subscribe(data => expect(data[0].id).toBe(20));
    http.expectOne('http://localhost:8080/api/public/categories/active').flush([categoryDto]);
    repo.latest().subscribe(data => expect(data[0].source).toBe('http'));
    http.expectOne('http://localhost:8080/api/public/products/latest').flush([productDto()]);
    repo.featured().subscribe(data => expect(data.content[0].price).toBe(6500));
    http.expectOne('http://localhost:8080/api/public/products/featured?page=0&size=6').flush(productPage([productDto()], { size: 6 }));
    repo.product(313).subscribe(data => expect(data.id).toBe(313));
    http.expectOne('http://localhost:8080/api/public/products/313').flush(productDto());
  });
  it.each([404, 500, 503])('normalizes HTTP %s without exposing internal errors', status => {
    let error: ApiError | undefined;
    repo.product(313).subscribe({ error: e => error = e });
    http.expectOne('http://localhost:8080/api/public/products/313').flush({ password: 'sensitive-error-test' }, { status, statusText: 'Error' });
    expect(error?.status).toBe(status); expect(error?.message).not.toContain('sensitive-error-test');
  });
  it('uses the 60 second transport timeout and handles timeout as a connection error', () => {
    let error: ApiError | undefined; repo.latest().subscribe({ error: e => error = e });
    const req = http.expectOne('http://localhost:8080/api/public/products/latest');
    expect(req.request.timeout).toBe(60_000); req.error(new ProgressEvent('timeout'));
    expect(error?.kind).toBe('connection');
  });
  it('rejects structurally invalid JSON and malformed categories', () => {
    let error: ApiError | undefined; repo.latest().subscribe({ error: e => error = e });
    http.expectOne('http://localhost:8080/api/public/products/latest').flush({ content: [] });
    expect(error?.kind).toBe('invalid-response');
    repo.categories().subscribe({ error: e => error = e });
    http.expectOne('http://localhost:8080/api/public/categories/active').flush([{}]);
    expect(error?.kind).toBe('invalid-response');
  });
  it('rejects invalid IDs without any network request', () => {
    expect(() => repo.product(-1)).toThrow(); expect(() => repo.product(1.2)).toThrow();
    expect(() => repo.catalog({ categoryId: 0 })).toThrow();
    http.expectNone(() => true);
  });
});
