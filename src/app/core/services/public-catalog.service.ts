import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, defer, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { PUBLIC_CATALOG_REPOSITORY } from '../repositories/public-catalog.repository';
import { CatalogQuery, PublicPage } from '../api/public-catalog.dto';
import { PublicCategory } from '../api/public-category.model';
import { PublicProduct } from '../models/public-product.model';
import { ApiError, toApiError } from '../api/api-error';

export interface RemoteState<T> { readonly status: 'loading' | 'ready' | 'error'; readonly data: T | null; readonly error: ApiError | null; }
const loading = <T>(): RemoteState<T> => ({ status: 'loading', data: null, error: null });
const ready = <T>(data: T): RemoteState<T> => ({ status: 'ready', data, error: null });
const failed = <T>(error: unknown): RemoteState<T> => ({ status: 'error', data: null, error: toApiError(error) });
export interface HomeCatalog { categories: readonly PublicCategory[]; latest: readonly PublicProduct[]; featured: readonly PublicProduct[]; }

/** Per-view application state. switchMap cancels obsolete requests; no DEMO fallback. */
@Injectable()
export class PublicCatalogService {
  private readonly repository = inject(PUBLIC_CATALOG_REPOSITORY);
  private readonly queries = new Subject<CatalogQuery>();
  private readonly ids = new Subject<number>();
  private readonly categoryRequests = new Subject<void>();
  private readonly homeRequests = new Subject<void>();
  private lastQuery: CatalogQuery = {};
  private lastId = 0;
  readonly page = signal<RemoteState<PublicPage<PublicProduct>>>(loading());
  readonly product = signal<RemoteState<PublicProduct>>(loading());
  readonly categories = signal<RemoteState<readonly PublicCategory[]>>(loading());
  readonly home = signal<RemoteState<HomeCatalog>>(loading());

  constructor() {
    this.queries.pipe(switchMap(query => {
      this.page.set(loading());
      return defer(() => this.repository.catalog(query)).pipe(map(data => ready(data)), catchError(error => of(failed<PublicPage<PublicProduct>>(error))));
    }), takeUntilDestroyed()).subscribe(state => this.page.set(state));
    this.ids.pipe(switchMap(id => {
      this.product.set(loading());
      return defer(() => this.repository.product(id)).pipe(map(data => ready(data)), catchError(error => of(failed<PublicProduct>(error))));
    }), takeUntilDestroyed()).subscribe(state => this.product.set(state));
    this.categoryRequests.pipe(switchMap(() => {
      this.categories.set(loading());
      return defer(() => this.repository.categories()).pipe(map(data => ready(data)), catchError(error => of(failed<readonly PublicCategory[]>(error))));
    }), takeUntilDestroyed()).subscribe(state => this.categories.set(state));
    this.homeRequests.pipe(switchMap(() => {
      this.home.set(loading());
      return forkJoin({ categories: defer(() => this.repository.categories()), latest: defer(() => this.repository.latest()),
        featured: defer(() => this.repository.featured()) }).pipe(map(data => ready({ ...data, featured: data.featured.content })),
        catchError(error => of(failed<HomeCatalog>(error))));
    }), takeUntilDestroyed()).subscribe(state => this.home.set(state));
  }
  load(query: CatalogQuery): void { this.lastQuery = { ...query }; this.queries.next(this.lastQuery); }
  retry(): void { this.load(this.lastQuery); }
  loadProduct(id: number): void { this.lastId = id; this.ids.next(id); }
  retryProduct(): void { this.loadProduct(this.lastId); }
  refreshForPurchase(id:number) { return defer(()=>this.repository.product(id)).pipe(tap(data=>this.product.set(ready(data)))); }
  loadCategories(): void { this.categoryRequests.next(); }
  loadHome(): void { this.homeRequests.next(); }
}
