import { Injectable, inject } from '@angular/core';
import { DemoAccountOrder } from '../models/account.model';
import { DemoAccountStateService } from './demo-account-state.service';

/** Formato permitido para el identificador de pedido que llega por la URL. */
export const ORDER_ID_PATTERN = /^[A-Z0-9-]{1,32}$/;

/**
 * Consulta del detalle de un pedido del usuario autenticado (HU-13).
 *
 * Implementación DEMO con latencia simulada. Devuelve `null` tanto si el
 * pedido no existe como si el identificador es inválido; al integrar la API,
 * un pedido ajeno (403) también se tratará como `null` para no revelar que
 * existe (PS-HU13-01). La propiedad la valida siempre el backend.
 */
@Injectable({ providedIn: 'root' })
export class OrderDetailService {
  private static readonly DEMO_DELAY_MS = 400;
  private readonly account = inject(DemoAccountStateService);

  getMyOrder(id: string): Promise<DemoAccountOrder | null> {
    if (!ORDER_ID_PATTERN.test(id)) {
      return Promise.resolve(null); // Identificador manipulado: no se consulta.
    }
    return new Promise((resolve) =>
      setTimeout(() => {
        const order = this.account.getOrder(id);
        resolve(order ? { ...order, items: [...order.items] } : null);
      }, OrderDetailService.DEMO_DELAY_MS),
    );
  }
}
