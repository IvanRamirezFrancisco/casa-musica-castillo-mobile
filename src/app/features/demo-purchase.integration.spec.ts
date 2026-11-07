import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router, RouteReuseStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { By } from '@angular/platform-browser';
import { routes } from '../app.routes';
import { ProductDetailPage } from './catalog/product-detail/product-detail.page';
import { CartPage } from './cart/cart.page';
import { DeliveryMethodPage } from './checkout/delivery-method/delivery-method.page';
import { PaymentMethodPage } from './checkout/payment-method/payment-method.page';
import { CheckoutSummaryPage } from './checkout/checkout-summary/checkout-summary.page';
import { ConfirmationPage } from './checkout/confirmation/confirmation.page';
import { DemoCheckoutStateService } from '../core/services/demo-checkout-state.service';
import { OrderDetailService } from '../core/services/order-detail.service';
import { OrdersPage } from './orders/orders.page';
import { OrdersService } from '../core/services/orders.service';
import { vi } from 'vitest';
import { DemoAccountOrder } from '../core/models/account.model';
import { DEMO_ORDER_REPOSITORY } from '../core/repositories/demo-order.repository';

describe('Actividad 4: recorrido DEMO por rutas reales', () => {
  it('selección → carrito → entrega/pago → confirmación → historial → detalle', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(),
      provideIonicAngular({ animated: false }), { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }] });
    const state = TestBed.inject(DemoCheckoutStateService); state.clearCheckout();
    const harness = await RouterTestingHarness.create();
    const product = await harness.navigateByUrl('/products/1', ProductDetailPage);
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('cmc-button button')!.click();
    harness.detectChanges(); expect(harness.routeNativeElement!.textContent).toContain('Producto agregado');
    expect(product.product()?.id).toBe(1);
    await harness.navigateByUrl('/main/cart');
    const cart = harness.routeDebugElement!.query(By.directive(CartPage)).componentInstance as CartPage;
    cart.updateQuantity('catalog-1', 1); expect(state.subtotal()).toBe(4980);
    await harness.navigateByUrl('/checkout');
    const delivery = await harness.navigateByUrl('/checkout/delivery', DeliveryMethodPage);
    delivery.selectMethod('home'); delivery.confirmSelection(); await harness.fixture.whenStable();
    const payment = await harness.navigateByUrl('/checkout/payment', PaymentMethodPage);
    payment.selectMethod('transfer'); payment.confirmSelection(); await harness.fixture.whenStable();
    const confirmation = await harness.navigateByUrl('/checkout/confirmation', ConfirmationPage);
    harness.detectChanges();
    const order = confirmation.order()!;
    expect(order.summary.total).toBe(5130);
    expect(harness.routeNativeElement!.textContent).toContain('No se realizaron cobros reales');
    confirmation.goToOrders(); await harness.fixture.whenStable(); harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/main/orders');
    const orders = harness.routeDebugElement!.query(By.directive(OrdersPage)).componentInstance as OrdersPage;
    await orders.loadOrders(); harness.detectChanges();
    await vi.waitFor(() => {
      harness.detectChanges(); expect(harness.routeNativeElement!.textContent).toContain(order.id);
    }, { timeout: 3000 });
    expect(state.cartItems()).toEqual([]);
    const detail = await TestBed.inject(OrderDetailService).getMyOrder(order.id);
    expect(detail?.items[0]).toMatchObject({ quantity: 2, unitPrice: 2490 });
    expect(detail?.status).toBe('pending');
  }, 15000);

  it('refresca la pestaña cacheada y descarta respuestas antiguas', async () => {
    let resolveFirst!: (value: DemoAccountOrder[]) => void;
    const list = vi.fn().mockImplementationOnce(() => new Promise<DemoAccountOrder[]>(resolve => { resolveFirst = resolve; }))
      .mockResolvedValue([]);
    TestBed.configureTestingModule({ imports: [OrdersPage], providers: [provideRouter([]),
      { provide: OrdersService, useValue: { listMyOrders: list } }] });
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable(); resolveFirst(TestBed.inject(DEMO_ORDER_REPOSITORY).list()); await fixture.whenStable();
    expect(list).toHaveBeenCalledTimes(2); expect(fixture.componentInstance.status()).toBe('ready');
    expect(fixture.componentInstance.orders()).toEqual([]);
  });
  it('no permite confirmar un carrito vacío aunque haya métodos seleccionados', async () => {
    TestBed.configureTestingModule({ imports: [CheckoutSummaryPage], providers: [provideRouter([])] });
    const state = TestBed.inject(DemoCheckoutStateService); state.clearCheckout();
    state.setDeliveryMethod({ type: 'store', title: 'Tienda', description: 'Demo', cost: 0 });
    state.setPaymentMethod({ type: 'transfer', title: 'Transferencia', description: 'Demo' });
    const fixture = TestBed.createComponent(CheckoutSummaryPage); fixture.detectChanges();
    expect(fixture.componentInstance.canProceed()).toBe(false);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    fixture.componentInstance.confirmOrder(); expect(navigate).not.toHaveBeenCalled();
  });

  it('muestra error controlado si falla la creación y no incorpora un pedido', () => {
    TestBed.configureTestingModule({ imports: [ConfirmationPage], providers: [provideRouter([])] });
    const state = TestBed.inject(DemoCheckoutStateService);
    state.setDeliveryMethod({ type: 'store', title: 'Tienda', description: 'Demo', cost: 0 });
    state.setPaymentMethod({ type: 'transfer', title: 'Transferencia', description: 'Demo' });
    const before = TestBed.inject(DEMO_ORDER_REPOSITORY).list();
    vi.spyOn(state, 'placeOrder').mockImplementation(() => { throw new Error('Internal fixture'); });
    const fixture = TestBed.createComponent(ConfirmationPage); fixture.detectChanges();
    expect(fixture.componentInstance.order()).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No pudimos crear el pedido DEMO');
    expect(fixture.nativeElement.textContent).not.toContain('Internal fixture');
    expect(TestBed.inject(DEMO_ORDER_REPOSITORY).list()).toEqual(before);
  });

  it('revalida la confirmación cacheada sin duplicar y refleja cambios de cantidades', () => {
    TestBed.configureTestingModule({ imports: [ConfirmationPage], providers: [provideRouter([])] });
    const state = TestBed.inject(DemoCheckoutStateService);
    state.setDeliveryMethod({ type: 'store', title: 'Tienda', description: 'Demo', cost: 0 });
    state.setPaymentMethod({ type: 'transfer', title: 'Transferencia', description: 'Demo' });
    const fixture = TestBed.createComponent(ConfirmationPage); fixture.detectChanges();
    const page = fixture.componentInstance; const original = page.order()!;
    page.ionViewWillEnter(); expect(page.order()!.id).toBe(original.id);
    expect(TestBed.inject(DEMO_ORDER_REPOSITORY).list().filter(order => order.id === original.id)).toHaveLength(1);
    state.updateQuantity('p1', 1); page.ionViewWillEnter();
    expect(page.order()!.summary.subtotal).toBe(24500);
    state.clearCheckout();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.ionViewWillEnter(); expect(page.order()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/checkout'], { replaceUrl: true });
  });

});
