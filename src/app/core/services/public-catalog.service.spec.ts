import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicCatalogService } from './public-catalog.service';
import { PUBLIC_CATALOG_REPOSITORY } from '../repositories/public-catalog.repository';
import { PublicPage } from '../api/public-catalog.dto';
import { PublicProduct } from '../models/public-product.model';
import { ApiError } from '../api/api-error';
import { mapPublicProduct } from '../api/public-product.mapper';
import { categoryDto, productDto } from '../api/public-catalog.testing';

describe('Public catalog application state', () => {
  const product = mapPublicProduct(productDto(), 'https://backend.test');
  const page: PublicPage<PublicProduct> = { content: [product], number: 0, size: 12, totalElements: 1, totalPages: 1, first: true, last: true };
  let service: PublicCatalogService;
  const repo = { catalog: vi.fn(), product: vi.fn(), categories: vi.fn(), latest: vi.fn(), featured: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    repo.catalog.mockReturnValue(of(page)); repo.product.mockReturnValue(of(product)); repo.categories.mockReturnValue(of([categoryDto]));
    repo.latest.mockReturnValue(of([product])); repo.featured.mockReturnValue(of(page));
    TestBed.configureTestingModule({ providers: [PublicCatalogService, { provide: PUBLIC_CATALOG_REPOSITORY, useValue: repo }] });
    service = TestBed.inject(PublicCatalogService);
  });
  it('ignores out of order results after rapidly changing category and search', () => {
    const old = new Subject<PublicPage<PublicProduct>>(); const current = new Subject<PublicPage<PublicProduct>>();
    repo.catalog.mockReturnValueOnce(old).mockReturnValueOnce(current);
    service.load({ keyword: 'old', categoryId: 20 }); service.load({ keyword: 'new', categoryId: 21 });
    expect(old.observed).toBe(false); expect(service.page().status).toBe('loading');
    current.next({ ...page, totalElements: 2 }); old.next(page);
    expect(service.page().data?.totalElements).toBe(2);
  });
  it('retains a copy of retry filters and survives a request error', () => {
    repo.catalog.mockReturnValueOnce(throwError(() => new ApiError('http', 503)));
    const query = { keyword: 'guitarra' }; service.load(query); query.keyword = 'mutated';
    expect(service.page().status).toBe('error'); service.retry();
    expect(repo.catalog).toHaveBeenLastCalledWith({ keyword: 'guitarra' }); expect(service.page().status).toBe('ready');
  });
  it('cancels stale detail and retries after a synchronous invalid ID', () => {
    const old = new Subject<PublicProduct>(); repo.product.mockReturnValueOnce(old).mockImplementationOnce(() => { throw new ApiError('invalid-response', 0); });
    service.loadProduct(313); service.loadProduct(0); old.next(product);
    expect(service.product().status).toBe('error'); expect(old.observed).toBe(false);
    service.retryProduct(); expect(service.product().data?.source).toBe('http');
  });
  it('loads home from real categories/latest/featured and can retry all after failure', () => {
    repo.latest.mockReturnValueOnce(throwError(() => new ApiError('http', 500)));
    service.loadHome(); expect(service.home().status).toBe('error');
    service.loadHome(); expect(service.home().data).toEqual({ categories: [categoryDto], latest: [product], featured: [product] });
  });
  it('retries category errors without killing the stream', () => {
    repo.categories.mockReturnValueOnce(throwError(() => new Error()));
    service.loadCategories(); expect(service.categories().status).toBe('error');
    service.loadCategories(); expect(service.categories().data?.[0].id).toBe(20);
  });
});
