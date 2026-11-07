import { InjectionToken, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { PublicPage } from '../api/public-catalog.dto';
import type { OrderTimelineEvent, RealOrder } from '../models/order.model';
import { HttpRealOrderRepository } from '../infrastructure/http-real-order.repository';

/**
 * Puerto de consulta autenticada de pedidos (`OrderController`).
 * Solo acepta identificadores numéricos enteros positivos: nunca IDs `DEMO-*`.
 */
export interface RealOrderRepository {
  list(page?: number, size?: number): Observable<PublicPage<RealOrder>>;
  findById(id: number): Observable<RealOrder>;
  timeline(id: number): Observable<readonly OrderTimelineEvent[]>;
}

export const REAL_ORDER_REPOSITORY = new InjectionToken<RealOrderRepository>('REAL_ORDER_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(HttpRealOrderRepository),
});
