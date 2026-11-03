import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { cartDto, orderDto, pricePreviewDto, testSession } from '../../core/api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { MemorySessionStore } from '../../core/infrastructure/memory-session.store';
import { CHECKOUT_REPOSITORY, REAL_CHECKOUT_WRITE_ENABLED } from '../../core/repositories/checkout.repository';
import { authInterceptor } from '../../core/security/auth.interceptor';
import { SESSION_STORE } from '../../core/security/session-store.token';
import { AuthService } from '../../core/services/auth.service';
import { CheckoutSummaryPage } from './checkout-summary/checkout-summary.page';

const base = 'https://api.example.test';

describe('checkout real seguro conectado (integración)', () => {
  let http: HttpTestingController;

  const setup = async (writeEnabled: boolean) => {
    const store = new MemorySessionStore();
    await store.save(testSession());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideIonicAngular({ animated: false }),
        { provide: API_BASE_URL, useValue: base },
        { provide: BACKEND_SESSION_ENABLED, useValue: true },
        { provide: REAL_CHECKOUT_WRITE_ENABLED, useValue: writeEnabled },
        { provide: SESSION_STORE, useValue: store },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    await TestBed.inject(AuthService).restore();
  };

  afterEach(() => http.verify());

  it('por defecto (writeEnabled=false) cotiza /price-preview pero bloquea POST /api/checkout', async () => {
    await setup(false);
    const page = TestBed.createComponent(CheckoutSummaryPage);
    page.detectChanges();

    http.expectOne(`${base}/api/cart`).flush(cartDto());
    const previewReq = http.expectOne(`${base}/api/checkout/price-preview`);
    expect(previewReq.request.body).toEqual({ deliveryOption: 'PICKUP' });
    previewReq.flush(pricePreviewDto({ deliveryMethod: 'PICKUP', deliveryLabel: 'Recoger en sucursal', requiresAddress: false, shipping: 0, total: 15080 }));
    page.detectChanges();

    expect(page.nativeElement.textContent).toContain('Modo seguro activo');
    expect(page.nativeElement.textContent).toContain('$15,080.00');

    const view = page.debugElement.children[0].componentInstance;
    expect(view.canSubmit()).toBe(false);
    view.submit();
    page.detectChanges();
    http.expectNone(`${base}/api/checkout`);
    expect(page.nativeElement.textContent).toContain('bloqueada por seguridad');

    const repo = TestBed.inject(CHECKOUT_REPOSITORY);
    await expect(
      firstValueFrom(repo.submitCheckout({ deliveryOption: 'PICKUP', billingAddress: 'Calle 1', paymentMethod: 'BANK_TRANSFER' })),
    ).rejects.toThrow();
    http.expectNone(`${base}/api/checkout`);
  });

  it('en entorno aislado autorizado (writeEnabled=true) valida domicilios, cotiza, valida carrito y envía POST /api/checkout', async () => {
    await setup(true);
    const page = TestBed.createComponent(CheckoutSummaryPage);
    page.detectChanges();

    http.expectOne(`${base}/api/cart`).flush(cartDto());
    http.expectOne(`${base}/api/checkout/price-preview`).flush(pricePreviewDto());
    page.detectChanges();

    const view = page.debugElement.children[0].componentInstance;
    expect(view.canSubmit()).toBe(true);

    // Sin domicilios requeridos no envía petición HTTP
    view.submit();
    page.detectChanges();
    http.expectNone(`${base}/api/cart/validate`);
    expect(page.nativeElement.textContent).toContain('Completa los domicilios requeridos');

    // Cambiar modalidad de entrega recotiza con estado/ciudad/CP
    view.form.patchValue({
      state: 'Hidalgo',
      city: 'Huejutla',
      postalCode: '43000',
      shippingAddress: 'Av. Revolución 10, Centro',
      billingAddress: 'Av. Revolución 10, Centro',
      authorizedPersons: 'Juan Pérez',
      paymentMethod: 'MERCADO_PAGO',
      notes: 'Entregar por la tarde',
    });
    view.onDeliveryOptionChange('LOCAL');
    const localPreview = http.expectOne(`${base}/api/checkout/price-preview`);
    expect(localPreview.request.body).toEqual({
      deliveryOption: 'LOCAL',
      state: 'Hidalgo',
      city: 'Huejutla',
      postalCode: '43000',
    });
    localPreview.flush(pricePreviewDto());
    page.detectChanges();

    // Si /api/cart/validate falla por falta de stock, no ejecuta POST /api/checkout
    view.submit();
    http.expectOne(`${base}/api/cart/validate`).flush({
      valid: false,
      canCheckout: false,
      globalErrors: ['Stock insuficiente en Jarana Huasteca'],
      itemWarnings: [],
    });
    page.detectChanges();
    http.expectNone(`${base}/api/checkout`);
    expect(page.nativeElement.textContent).toContain('Stock insuficiente en Jarana Huasteca');

    // Intento con error de servidor en /api/checkout
    view.submit();
    http.expectOne(`${base}/api/cart/validate`).flush({ valid: true, canCheckout: true, globalErrors: [], itemWarnings: [] });
    const failedCheckout = http.expectOne(`${base}/api/checkout`);
    expect(failedCheckout.request.body).toEqual({
      deliveryOption: 'LOCAL',
      shippingAddress: 'Av. Revolución 10, Centro',
      state: 'Hidalgo',
      city: 'Huejutla',
      postalCode: '43000',
      authorizedPersons: 'Juan Pérez',
      billingAddress: 'Av. Revolución 10, Centro',
      paymentMethod: 'MERCADO_PAGO',
      notes: 'Entregar por la tarde',
    });
    failedCheckout.flush({ message: 'No fue posible procesar el pedido' }, { status: 400, statusText: 'Bad Request' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('No fue posible procesar el pedido');

    // Confirmación exitosa devuelve OrderDTO y refresca resumen de carrito
    view.submit();
    http.expectOne(`${base}/api/cart/validate`).flush({ valid: true, canCheckout: true, globalErrors: [], itemWarnings: [] });
    http.expectOne(`${base}/api/checkout`).flush(orderDto());
    http.expectOne(`${base}/api/cart/summary`).flush({
      cartId: 9,
      totalItems: 0,
      subtotal: 0,
      total: 0,
      canCheckout: false,
      unavailableItemsCount: 0,
      warningMessage: null,
    });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Pedido confirmado');
    expect(page.nativeElement.textContent).toContain('CMC-2026-0042');

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    view.openOrder(42);
    expect(navigate).toHaveBeenCalledWith(['/orders', 42]);

    const navRoot = vi.spyOn(TestBed.inject(NavController), 'navigateRoot').mockResolvedValue(true);
    view.goToOrders();
    expect(navRoot).toHaveBeenCalledWith(['/main/orders'], { replaceUrl: true });
  });

  it('maneja error en vista previa y cotización nacional con requiresQuote=true', async () => {
    await setup(true);
    const page = TestBed.createComponent(CheckoutSummaryPage);
    page.detectChanges();

    http.expectOne(`${base}/api/cart`).flush(cartDto());
    http.expectOne(`${base}/api/checkout/price-preview`).flush({}, { status: 500, statusText: 'Error' });
    page.detectChanges();

    const view = page.debugElement.children[0].componentInstance;
    expect(view.canSubmit()).toBe(false);
    view.submit();
    expect(view.errorMessage()).toContain('Calcula primero una vista previa válida');

    view.onDeliveryOptionChange('NATIONAL');
    http.expectOne(`${base}/api/checkout/price-preview`).flush(
      pricePreviewDto({
        deliveryMethod: 'NATIONAL',
        requiresQuote: true,
        canProceedToPayment: false,
        quoteMessage: 'Contacta por WhatsApp para cotizar envío nacional.',
      }),
    );
    page.detectChanges();
    expect(view.canSubmit()).toBe(false);
    expect(page.nativeElement.textContent).toContain('Contacta por WhatsApp para cotizar envío nacional.');

    const back = vi.spyOn(TestBed.inject(NavController), 'navigateBack').mockResolvedValue(true);
    view.goBack();
    expect(back).toHaveBeenCalledWith(['/main/cart']);
  });

  it('cancela HTTP obsoleto al cambiar entrega y descarta importes al editar destino', async () => {
    await setup(false);
    const page = TestBed.createComponent(CheckoutSummaryPage);
    page.detectChanges();
    http.expectOne(`${base}/api/cart`).flush(cartDto());
    const pickup = http.expectOne(`${base}/api/checkout/price-preview`);
    const view = page.debugElement.children[0].componentInstance;
    view.onDeliveryOptionChange('LOCAL');
    expect(pickup.cancelled).toBe(true);
    const local = http.expectOne(`${base}/api/checkout/price-preview`);
    expect(local.request.body.deliveryOption).toBe('LOCAL');
    local.flush(pricePreviewDto());
    expect(view.pricePreview()?.total).toBe(15230);
    view.form.controls.city.setValue('Otra ciudad');
    expect(view.pricePreview()).toBeNull();
    expect(view.canSubmit()).toBe(false);
    view.requestPreview();
    expect(http.expectOne(`${base}/api/checkout/price-preview`).request.body.city).toBe('Otra ciudad');
    page.destroy();
    // The per-view state cancels the outstanding HTTP request on destruction.
  });

  it('muestra respuesta malformada, permite reintentar y no expone endpoints ni crea pedidos', async () => {
    await setup(false);
    const page = TestBed.createComponent(CheckoutSummaryPage);
    page.detectChanges();
    http.expectOne(`${base}/api/cart`).flush(cartDto());
    http.expectOne(`${base}/api/checkout/price-preview`).flush({ total: 'incorrecto' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('respondió de forma inesperada');
    expect(page.nativeElement.textContent).not.toContain('/api/');
    const view = page.debugElement.children[0].componentInstance;
    expect(view.pricePreview()).toBeNull();
    view.requestPreview();
    http.expectOne(`${base}/api/checkout/price-preview`).flush(pricePreviewDto());
    page.detectChanges();
    expect(page.nativeElement.textContent).not.toContain('respondió de forma inesperada');
    expect(view.pricePreview()?.total).toBe(15230);
    http.expectNone(`${base}/api/checkout`);
  });

  it('rechaza campos demasiado largos antes de validar o confirmar una compra', async () => {
    await setup(true);
    const page = TestBed.createComponent(CheckoutSummaryPage);
    page.detectChanges();
    http.expectOne(`${base}/api/cart`).flush(cartDto());
    http.expectOne(`${base}/api/checkout/price-preview`).flush(pricePreviewDto({ requiresAddress: false }));
    const view = page.debugElement.children[0].componentInstance;
    view.form.patchValue({ billingAddress: 'Calle de prueba', notes: 'x'.repeat(1001) });
    view.submit();
    expect(view.errorMessage()).toContain('longitud');
    http.expectNone(`${base}/api/cart/validate`);
    http.expectNone(`${base}/api/checkout`);
  });
});
