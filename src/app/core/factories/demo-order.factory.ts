import { Injectable } from '@angular/core';
import { CartItem, DeliveryMethod, DemoOrder, PaymentMethod } from '../models/checkout.model';
import { DemoAccountOrder } from '../models/account.model';

/** Creates validated, independent checkout and history representations. No payment is executed. */
@Injectable({ providedIn: 'root' })
export class DemoOrderFactory {
  create(items: readonly CartItem[], delivery: DeliveryMethod | null, payment: PaymentMethod | null): DemoOrder {
    if (!items.length || !delivery || !payment ||
        !['store', 'home'].includes(delivery.type) ||
        !['transfer', 'mercadopago'].includes(payment.type) ||
        !Number.isFinite(delivery.cost) || delivery.cost < 0 ||
        items.some(item => !item.id || !Number.isFinite(item.price) || item.price < 0 ||
          !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
      throw new Error('Revisa los productos y selecciona entrega y pago para el pedido DEMO.');
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (!Number.isFinite(subtotal + delivery.cost)) throw new Error('El importe DEMO no es válido.');
    return {
      id: `DEMO-${crypto.randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase()}`,
      items: items.map(item => ({ ...item })), delivery: { ...delivery }, payment: { ...payment },
      summary: { subtotal, shipping: delivery.cost, total: subtotal + delivery.cost }, createdAt: new Date(),
    };
  }

  toHistory(order: DemoOrder): DemoAccountOrder {
    return {
      id: order.id, date: order.createdAt.toISOString(), status: 'pending',
      items: order.items.map(item => ({ id: item.id, name: item.name, unitPrice: item.price, quantity: item.quantity })),
      shipping: order.summary.shipping, deliveryMethod: order.delivery.title, paymentMethod: order.payment.title,
    };
  }
}
