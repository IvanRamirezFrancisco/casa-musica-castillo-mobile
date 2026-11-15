import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, throwError } from 'rxjs';
import type { RealOrderRepository } from '../repositories/real-order.repository';
import type { RealOrder } from '../models/order.model';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiClientService } from '../api/api-client.service';
import { ApiError } from '../api/api-error';
import { parseOrder, parseOrderPage, parseOrderTimeline } from '../api/order.validation';
import { AuthService } from '../services/auth.service';

const isOrderId = (id: number): boolean => Number.isSafeInteger(id) && id > 0;

@Injectable({ providedIn: 'root' })
export class HttpRealOrderRepository implements RealOrderRepository {
  private readonly api = inject(ApiClientService);
  private readonly base = inject(API_BASE_URL);
  private readonly auth = inject(AuthService);

  list(page = 0, size = 10) {
    const safePage = Number.isSafeInteger(page) ? Math.max(0, page) : 0;
    const safeSize = Number.isSafeInteger(size) ? Math.min(50, Math.max(1, size)) : 10;
    const params = new HttpParams().set('page', safePage).set('size', safeSize);
    return this.api.get<unknown>('/api/orders/my', params, { auth: true }).pipe(
      map((body) => {
        const parsed = parseOrderPage(body, this.base);
        parsed.content.forEach((order) => this.assertOwned(order));
        return parsed;
      }),
    );
  }

  findById(id: number) {
    if (!isOrderId(id)) return throwError(() => new ApiError('invalid-response', 0));
    return this.api.get<unknown>(`/api/orders/my/${id}`, undefined, { auth: true }).pipe(
      map((body) => this.assertOwned(parseOrder(body, this.base))),
    );
  }

  timeline(id: number) {
    if (!isOrderId(id)) return throwError(() => new ApiError('invalid-response', 0));
    return this.api.get<unknown>(`/api/orders/my/${id}/timeline`, undefined, { auth: true }).pipe(map(parseOrderTimeline));
  }

  /** Defensa en profundidad: rechaza cualquier pedido cuyo `userId` no coincida con la sesión actual. */
  private assertOwned(order: RealOrder): RealOrder {
    const owner = this.auth.user()?.id;
    if (owner !== undefined && order.userId !== owner) throw new ApiError('http', 403);
    return order;
  }
}
