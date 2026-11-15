import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { OrdersService } from './orders.service';
import { DemoAccountStateService } from './demo-account-state.service';

describe('OrdersService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve los pedidos DEMO después de la latencia simulada', async () => {
    const service = TestBed.inject(OrdersService);
    const promesa = service.listMyOrders();
    await vi.runAllTimersAsync();
    const pedidos = await promesa;
    expect(pedidos.map((o) => o.id)).toEqual(TestBed.inject(DemoAccountStateService).orders().map((o) => o.id));
  });

  it('entrega una copia para que la pantalla no modifique el estado compartido', async () => {
    const service = TestBed.inject(OrdersService);
    const promesa = service.listMyOrders();
    await vi.runAllTimersAsync();
    const pedidos = await promesa;
    pedidos.pop();
    expect(TestBed.inject(DemoAccountStateService).orders().length).toBe(pedidos.length + 1);
  });
});
