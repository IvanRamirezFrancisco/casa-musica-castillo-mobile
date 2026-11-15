import { TestBed } from '@angular/core/testing';
import { DEMO_ORDER_REPOSITORY } from '../repositories/demo-order.repository';
import { InMemoryDemoOrderRepository } from './in-memory-demo-order.repository';

describe('InMemoryDemoOrderRepository', () => {
  it('resuelve la misma instancia por contrato y clase', () => {
    expect(TestBed.inject(DEMO_ORDER_REPOSITORY)).toBe(TestBed.inject(InMemoryDemoOrderRepository));
  });
  it('aísla partidas al leer y escribir; evita duplicar el mismo ID', () => {
    const repo = TestBed.inject(DEMO_ORDER_REPOSITORY);
    const order = { ...repo.list()[0], id: 'DEMO-NEW' };
    repo.add(order); repo.add(order);
    order.items[0].quantity = 100;
    const read = repo.findById(order.id)!;
    expect(read.items[0].quantity).toBe(1);
    read.items[0].quantity = 200;
    const list = repo.list(); list[0].items[0].quantity = 300;
    expect(repo.findById(order.id)!.items[0].quantity).toBe(1);
    expect(repo.list().filter(item => item.id === order.id)).toHaveLength(1);
    expect(repo.findById('unknown')).toBeNull();
  });
  it('rechaza IDs incompatibles con las rutas sin alterar el historial', () => {
    const repo = TestBed.inject(DEMO_ORDER_REPOSITORY); const before = repo.list();
    expect(() => repo.add({ ...before[0], id: '../bad' })).toThrow();
    expect(repo.list()).toEqual(before);
  });
});
