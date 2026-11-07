import { InjectionToken, inject } from '@angular/core';
import { DemoAccountOrder } from '../models/account.model';
import { InMemoryDemoOrderRepository } from '../infrastructure/in-memory-demo-order.repository';

/** Boundary consumed by application services. No backend or session semantics. */
export interface DemoOrderRepository {
  readonly orders: () => DemoAccountOrder[];
  list(): DemoAccountOrder[];
  findById(id: string): DemoAccountOrder | null;
  add(order: DemoAccountOrder): void;
}

export const DEMO_ORDER_REPOSITORY = new InjectionToken<DemoOrderRepository>('DEMO_ORDER_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(InMemoryDemoOrderRepository),
});
