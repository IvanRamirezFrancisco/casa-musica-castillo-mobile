import { Injectable, signal } from '@angular/core';
import type { DemoOrderRepository } from '../repositories/demo-order.repository';
import { DemoAccountOrder } from '../models/account.model';
import { DEMO_ACCOUNT_ORDERS } from './demo-orders.data';

const copy = (order: DemoAccountOrder): DemoAccountOrder => ({
  ...order, items: order.items.map(item => ({ ...item })),
});

/** Session-local DEMO history. All reads/writes isolate nested item references. */
@Injectable({ providedIn: 'root' })
export class InMemoryDemoOrderRepository implements DemoOrderRepository {
  private readonly state = signal(DEMO_ACCOUNT_ORDERS.map(copy));
  readonly orders = () => this.list();

  list(): DemoAccountOrder[] { return this.state().map(copy); }
  findById(id: string): DemoAccountOrder | null {
    const order = this.state().find(order => order.id === id);
    return order ? copy(order) : null;
  }
  add(order: DemoAccountOrder): void {
    if (!/^[A-Z0-9-]{1,32}$/.test(order.id)) throw new Error('Identificador DEMO inválido.');
    // Re-entering confirmation must not duplicate a completed demo order.
    if (!this.state().some(current => current.id === order.id)) {
      this.state.update(orders => [copy(order), ...orders]);
    }
  }
}
