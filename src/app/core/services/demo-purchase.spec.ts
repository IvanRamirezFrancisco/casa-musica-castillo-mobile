import { TestBed } from '@angular/core/testing';
import { DemoCheckoutStateService } from './demo-checkout-state.service';
import { DEMO_ORDER_REPOSITORY } from '../repositories/demo-order.repository';
import { DemoCatalogService } from './demo-catalog.service';

describe('Aplicación de compra DEMO', () => {
  it('agrega, acumula y calcula precios del catálogo sin colisión con muestras anteriores', () => {
    const state = TestBed.inject(DemoCheckoutStateService);
    state.addProduct(1); state.addProduct(1);
    expect(state.cartItems().find(item => item.id === 'catalog-1')?.quantity).toBe(2);
    expect(state.cartItems().find(item => item.id === 'p1')?.price).toBe(4500);
    expect(state.subtotal()).toBe(24980);
    state.clearCheckout(); state.addProduct(2); state.updateQuantity('catalog-2', 2);
    expect(state.subtotal()).toBe(11850); expect(state.itemCount()).toBe(3);
    state.updateQuantity('catalog-2', NaN); expect(state.subtotal()).toBe(11850);
    expect(() => state.addProduct(999)).toThrow();
  });
  it('confirma una sola vez, conserva historial al limpiar y permite una segunda compra', () => {
    const state = TestBed.inject(DemoCheckoutStateService); const repo = TestBed.inject(DEMO_ORDER_REPOSITORY);
    state.clearCheckout(); state.addProduct(1);
    state.setDeliveryMethod({ type: 'store', title: 'Tienda', description: 'Demo', cost: 0 });
    state.setPaymentMethod({ type: 'transfer', title: 'Transferencia', description: 'Demo' });
    const order = state.placeOrder(); expect(state.placeOrder().id).toBe(order.id);
    order.items[0].quantity = 99;
    expect(repo.findById(order.id)?.items[0].quantity).toBe(1);
    expect(state.placeOrder().items[0].quantity).toBe(1);
    expect(repo.list().filter(item => item.id === order.id)).toHaveLength(1);
    state.clearCheckout(); expect(repo.findById(order.id)).not.toBeNull();
    expect(() => state.placeOrder()).toThrow();
    state.addProduct(1);
    state.setDeliveryMethod({ type: 'store', title: 'Tienda', description: 'Demo', cost: 0 });
    state.setPaymentMethod({ type: 'transfer', title: 'Transferencia', description: 'Demo' });
    expect(state.placeOrder().id).not.toBe(order.id);
  });
  it.each(['0', '-1', '01', '1.5', 'bad', '9007199254740992', '999'])('catálogo rechaza %s', id => {
    expect(TestBed.inject(DemoCatalogService).findById(id)).toBeNull();
  });
});
