import { Injectable, inject } from '@angular/core';
import { DemoAccountOrder } from '../models/account.model';
import { DemoAccountStateService } from './demo-account-state.service';

/**
 * Consulta de pedidos del usuario autenticado (HU-12).
 *
 * Implementación DEMO: devuelve los pedidos en memoria con una latencia
 * simulada. Al integrar la API, el backend debe filtrar por la identidad del
 * token; el cliente nunca envía un userId (PS-HU12-02).
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private static readonly DEMO_DELAY_MS = 400;
  private readonly account = inject(DemoAccountStateService);

  listMyOrders(): Promise<DemoAccountOrder[]> {
    return new Promise((resolve) =>
      setTimeout(() => resolve([...this.account.orders()]), OrdersService.DEMO_DELAY_MS),
    );
  }
}
