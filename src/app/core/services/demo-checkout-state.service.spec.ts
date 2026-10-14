import { TestBed } from '@angular/core/testing';
import { DemoCheckoutStateService } from './demo-checkout-state.service';

describe('UNITARIAS HU09-HU11: estado de compra DEMO', () => {
  let service: DemoCheckoutStateService;
  beforeEach(() => { service = TestBed.inject(DemoCheckoutStateService); });

  it('recalcula subtotal y total al cambiar cantidad y entrega', () => {
    expect(service.subtotal()).toBe(20000);
    service.updateQuantity('p1', 1);
    service.setDeliveryMethod({ type: 'home', title: 'Domicilio', description: 'Demo', cost: 150 });
    expect(service.subtotal()).toBe(24500);
    expect(service.shippingCost()).toBe(150);
    expect(service.total()).toBe(24650);
  });

  it('mantiene cantidad mínima y no modifica productos ante un ID desconocido', () => {
    service.updateQuantity('p1', -10);
    service.updateQuantity('unknown', 1);
    expect(service.cartItems()[0].quantity).toBe(1);
    expect(service.subtotal()).toBe(20000);
  });

  it('elimina un producto y permite limpiar todo el checkout', () => {
    service.removeItem('p3');
    expect(service.subtotal()).toBe(4500);
    service.setPaymentMethod({ type: 'transfer', title: 'Transferencia', description: 'Demo' });
    service.clearCheckout();
    expect(service.cartItems()).toEqual([]);
    expect(service.total()).toBe(0);
    expect(service.deliveryMethod()).toBeNull();
    expect(service.paymentMethod()).toBeNull();
  });

  it('genera una instantánea demostrativa coherente con los métodos seleccionados', () => {
    service.setDeliveryMethod({ type: 'store', title: 'Tienda', description: 'Demo', cost: 0 });
    service.setPaymentMethod({ type: 'transfer', title: 'Transferencia', description: 'Demo' });
    const order = service.placeOrder();
    expect(order.id).toMatch(/^DEMO-/);
    expect(order.summary).toEqual({ subtotal: 20000, shipping: 0, total: 20000 });
    expect(order.createdAt).toBeInstanceOf(Date);
    service.removeItem('p1');
    expect(order.items).toHaveLength(2);
    expect(service.cartItems()).toHaveLength(1);
  });
});
