import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import type { PublicCatalogRepository } from '../repositories/public-catalog.repository';
import { ApiClientService } from '../api/api-client.service';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiError } from '../api/api-error';
import { CatalogQuery, PublicSort } from '../api/public-catalog.dto';
import { isPublicCategory } from '../api/public-category.model';
import { parseProduct, parseProductPage, parseProducts } from '../api/public-catalog.validation';
import { mapPublicProduct } from '../api/public-product.mapper';

@Injectable({ providedIn: 'root' })
export class HttpPublicCatalogRepository implements PublicCatalogRepository {
  private readonly api = inject(ApiClientService);
  private readonly base = inject(API_BASE_URL);
  categories() {
    return this.api.get<unknown>('/api/public/categories/active').pipe(map(body => {
      if (!Array.isArray(body) || !body.every(isPublicCategory)) throw new ApiError('invalid-response', 200);
      return body;
    }));
  }
  catalog(query: CatalogQuery) {
    let params = new HttpParams().set('page', this.page(query.page)).set('size', this.size(query.size));
    const keyword = query.keyword?.trim().slice(0, 100);
    if (keyword) params = params.set('keyword', keyword);
    if (query.categoryId !== undefined) {
      if (!Number.isSafeInteger(query.categoryId) || query.categoryId < 1) throw new ApiError('invalid-response', 0);
      params = params.set('categoryId', query.categoryId);
    }
    const allowed: readonly PublicSort[] = ['featured', 'price_asc', 'price_desc', 'name_asc'];
    params = params.set('sortBy', allowed.includes(query.sortBy ?? 'featured') ? (query.sortBy ?? 'featured') : 'featured');
    return this.api.get<unknown>('/api/public/products/catalog', params).pipe(map(body => this.mapPage(body)));
  }
  product(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) throw new ApiError('invalid-response', 0);
    return this.api.get<unknown>(`/api/public/products/${id}`).pipe(map(body => mapPublicProduct(parseProduct(body), this.base)));
  }
  latest() {
    return this.api.get<unknown>('/api/public/products/latest').pipe(map(body => parseProducts(body).map(dto => mapPublicProduct(dto, this.base))));
  }
  featured() {
    return this.api.get<unknown>('/api/public/products/featured', new HttpParams().set('page', 0).set('size', 6))
      .pipe(map(body => this.mapPage(body)));
  }
  private mapPage(body: unknown) {
    const page = parseProductPage(body);
    return { ...page, content: page.content.map(dto => mapPublicProduct(dto, this.base)) };
  }
  private page(value = 0): number { return Number.isSafeInteger(value) ? Math.max(0, value) : 0; }
  private size(value = 12): number { return Number.isSafeInteger(value) ? Math.min(50, Math.max(1, value)) : 12; }
}
