import { Injectable, inject } from '@angular/core';
import { map, throwError } from 'rxjs';
import type { CartRepository } from '../repositories/cart.repository';
import { CART_LIMITS } from '../models/cart.model';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiClientService } from '../api/api-client.service';
import { ApiError } from '../api/api-error';
import { parseCart, parseCartSummary, parseCartValidation } from '../api/cart.validation';

const isId = (value: number): boolean => Number.isSafeInteger(value) && value > 0;
const isQuantity = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= CART_LIMITS.minQuantity && value <= CART_LIMITS.maxQuantity;

@Injectable({ providedIn: 'root' })
export class HttpCartRepository implements CartRepository {
  private readonly api = inject(ApiClientService);
  private readonly base = inject(API_BASE_URL);

  loadCart() {
    return this.api.get<unknown>('/api/cart', undefined, { auth: true }).pipe(map((body) => parseCart(body, this.base)));
  }

  summary() {
    return this.api.get<unknown>('/api/cart/summary', undefined, { auth: true }).pipe(map(parseCartSummary));
  }

  addItem(productId: number, quantity: number) {
    if (!isId(productId) || !isQuantity(quantity)) {
      return throwError(() => new ApiError('invalid-response', 0));
    }
    return this.api
      .post<unknown>('/api/cart/items', { productId, quantity }, { auth: true })
      .pipe(map((body) => parseCart(body, this.base)));
  }

  updateItemQuantity(itemId: number, quantity: number) {
    if (!isId(itemId) || !isQuantity(quantity)) {
      return throwError(() => new ApiError('invalid-response', 0));
    }
    // UpdateItemRequest exige itemId tanto en el path como en el body (@NotNull).
    return this.api
      .put<unknown>(`/api/cart/items/${itemId}`, { itemId, quantity }, { auth: true })
      .pipe(map((body) => parseCart(body, this.base)));
  }

  removeItem(itemId: number) {
    if (!isId(itemId)) return throwError(() => new ApiError('invalid-response', 0));
    return this.api
      .delete<unknown>(`/api/cart/items/${itemId}`, { auth: true })
      .pipe(map((body) => parseCart(body, this.base)));
  }

  clear() {
    return this.api.delete<unknown>('/api/cart', { auth: true }).pipe(map(() => undefined));
  }

  validate() {
    return this.api.get<unknown>('/api/cart/validate', undefined, { auth: true }).pipe(map(parseCartValidation));
  }
}
