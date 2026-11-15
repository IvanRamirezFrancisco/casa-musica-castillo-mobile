import { environment } from '../../../environments/environment';
import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogQuery, PublicPage } from '../api/public-catalog.dto';
import { PublicCategory } from '../api/public-category.model';
import { PublicProduct } from '../models/public-product.model';
import { HttpPublicCatalogRepository } from '../infrastructure/http-public-catalog.repository';

export interface PublicCatalogRepository {
  categories(): Observable<readonly PublicCategory[]>;
  catalog(query: CatalogQuery): Observable<PublicPage<PublicProduct>>;
  product(id: number): Observable<PublicProduct>;
  latest(): Observable<readonly PublicProduct[]>;
  featured(): Observable<PublicPage<PublicProduct>>;
}
export const PUBLIC_CATALOG_REPOSITORY = new InjectionToken<PublicCatalogRepository>('PUBLIC_CATALOG_REPOSITORY', {
  providedIn: 'root', factory: () => inject(HttpPublicCatalogRepository),
});
// Explicit presentation choice, never changed by HTTP failures. Production defaults to HTTP.
export const PUBLIC_CATALOG_ENABLED = new InjectionToken<boolean>('PUBLIC_CATALOG_ENABLED', {
  providedIn: 'root', factory: () => environment.publicCatalogEnabled,
});
