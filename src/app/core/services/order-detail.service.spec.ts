import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { OrderDetailService } from './order-detail.service';

describe('OrderDetailService', () => {
  let service: OrderDetailService;

  const consultar = async (id: string) => {
    const promesa = service.getMyOrder(id);
    await vi.runAllTimersAsync();
    return promesa;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrderDetailService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve el pedido DEMO solicitado', async () => {
    const pedido = await consultar('DEMO-1003');
    expect(pedido?.id).toBe('DEMO-1003');
    expect(pedido?.items.length).toBe(2);
  });

  it('devuelve null para un pedido inexistente', async () => {
    expect(await consultar('DEMO-9999')).toBeNull();
  });

  it.each(['', '../admin', "DEMO-1004' OR '1'='1", 'demo-1004', 'A'.repeat(33)])(
    'rechaza el identificador manipulado "%s" sin consultarlo',
    async (id) => {
      expect(await consultar(id)).toBeNull();
    },
  );
});
