import { TestBed } from '@angular/core/testing';
import { DemoOrderFactory } from './demo-order.factory';
import { CartItem, DeliveryMethod, PaymentMethod } from '../models/checkout.model';

describe('DemoOrderFactory', () => {
  const delivery: DeliveryMethod = { type: 'home', title: 'Domicilio DEMO', description: 'Ejemplo', cost: 150 };
  const payment: PaymentMethod = { type: 'transfer', title: 'Transferencia DEMO', description: 'Sin cobro' };
  const items = (): CartItem[] => [{ id: 'catalog-1', name: 'Guitarra', category: 'Guitarras', price: 2490, quantity: 2 }];
  it('calcula importes, genera IDs aceptados por detalle y separa referencias', () => {
    const factory = TestBed.inject(DemoOrderFactory);
    const source = items(); const shipping = { ...delivery }; const pay = { ...payment };
    const order = factory.create(source, shipping, pay);
    expect(order.id).toMatch(/^DEMO-[A-Z0-9]{24}$/);
    expect(factory.create(items(), delivery, payment).id).not.toBe(order.id);
    expect(order.summary).toEqual({ subtotal: 4980, shipping: 150, total: 5130 });
    source[0].quantity = 90; shipping.cost = 999; pay.title = 'Cambiado';
    expect(order.items[0].quantity).toBe(2); expect(order.delivery.cost).toBe(150);
    expect(order.payment.title).toBe(payment.title);
    const history = factory.toHistory(order);
    expect(history.status).toBe('pending'); expect(history.items[0].unitPrice).toBe(2490);
    history.items[0].quantity = 3; expect(order.items[0].quantity).toBe(2);
  });
  it.each([0, -1, 1.5, NaN, Infinity])('rechaza cantidad inválida %s', quantity => {
    expect(() => TestBed.inject(DemoOrderFactory).create([{ ...items()[0], quantity }], delivery, payment)).toThrow();
  });
  it.each([-1, NaN, Infinity])('rechaza precio inválido %s', price => {
    expect(() => TestBed.inject(DemoOrderFactory).create([{ ...items()[0], price }], delivery, payment)).toThrow();
  });
  it('rechaza carrito vacío, métodos faltantes y envío inválido', () => {
    const factory = TestBed.inject(DemoOrderFactory);
    expect(() => factory.create([], delivery, payment)).toThrow();
    expect(() => factory.create(items(), null, payment)).toThrow();
    expect(() => factory.create(items(), delivery, null)).toThrow();
    expect(() => factory.create(items(), { ...delivery, cost: -1 }, payment)).toThrow();
  });
});
