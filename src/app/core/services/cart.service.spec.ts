import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../api/api-base-url.token';
import { cartDto, cartItemDto, testSession } from '../api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../config/backend-session.token';
import { MemorySessionStore } from '../infrastructure/memory-session.store';
import { authInterceptor } from '../security/auth.interceptor';
import { SESSION_STORE } from '../security/session-store.token';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';

const base = 'https://api.example.test';

describe('CartService y HttpCartRepository', () => {
  let service: CartService;
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(async () => {
    const store = new MemorySessionStore();
    await store.save(testSession());
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: base }, { provide: SESSION_STORE, useValue: store },
      { provide: BACKEND_SESSION_ENABLED, useValue: true },
    ] });
    auth = TestBed.inject(AuthService);
    await auth.restore();
    service = TestBed.inject(CartService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('usa productId en POST /items e itemId en PUT/DELETE /items/{itemId}, sin llamar GET /api/cart adicional', () => {
    service.addProduct(313, 2).subscribe();
    const add = http.expectOne(`${base}/api/cart/items`);
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ productId: 313, quantity: 2 });
    add.flush(cartDto());
    expect(service.itemCount()).toBe(2);

    service.setItemQuantity(50, 3);
    const put = http.expectOne(`${base}/api/cart/items/50`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ itemId: 50, quantity: 3 });
    put.flush(cartDto([cartItemDto({ quantity: 3, subtotal: 19500 })], { totalItems: 3, subtotal: 19500, total: 22620 }));
    expect(service.cart()?.total).toBe(22620);

    service.removeItem(50);
    const del = http.expectOne(`${base}/api/cart/items/50`);
    expect(del.request.method).toBe('DELETE');
    del.flush(cartDto([], { totalItems: 0, subtotal: 0, tax: 0, total: 0 }));
    expect(service.itemCount()).toBe(0);
    http.expectNone(`${base}/api/cart`);
  });

  it('respeta el rango de cantidades 1..100 y rechaza IDs no válidos sin enviar peticiones', () => {
    service.setItemQuantity(50, 0);
    service.setItemQuantity(50, 101);
    service.setItemQuantity(50, 1.5);
    expect(service.notice()).toContain('1 a 100');
    const err = vi.fn();
    service.addProduct(0, 1).subscribe({ error: err });
    expect(err).toHaveBeenCalled();
    http.expectNone(() => true);
  });

  it('summary, validate, clear y descarte de respuestas fuera de orden', () => {
    service.refreshSummary().subscribe();
    http.expectOne(`${base}/api/cart/summary`).flush({ cartId: 9, totalItems: 4, subtotal: 100, total: 116, canCheckout: true, unavailableItemsCount: 0, warningMessage: null });
    expect(service.itemCount()).toBe(4);

    service.load();
    service.load();
    const loads = http.match(`${base}/api/cart`);
    loads[1].flush(cartDto());
    loads[0].flush(cartDto([], { totalItems: 0 }));
    expect(service.itemCount()).toBe(2);

    service.validate().subscribe();
    http.expectOne(`${base}/api/cart/validate`).flush({ valid: true, canCheckout: true, globalErrors: [], itemWarnings: [] });
    expect(service.validation()?.valid).toBe(true);

    service.clear();
    http.expectOne((r) => r.method === 'DELETE' && r.url === `${base}/api/cart`).flush({ message: 'ok' });
    expect(service.cart()?.items).toEqual([]);
    expect(service.itemCount()).toBe(0);
  });

  it('maneja errores del servidor y limpia el estado al cerrar sesión', () => {
    service.load();
    http.expectOne(`${base}/api/cart`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.error()).toContain('no pudo procesar');

    service.setItemQuantity(50, 2);
    http.expectOne(`${base}/api/cart/items/50`).flush({ message: 'Stock insuficiente' }, { status: 400, statusText: 'Bad' });
    expect(service.notice()).toBe('Stock insuficiente');

    service.removeItem(50);
    http.expectOne(`${base}/api/cart/items/50`).flush({}, { status: 500, statusText: 'Err' });
    service.clear();
    http.expectOne((r) => r.method === 'DELETE' && r.url === `${base}/api/cart`).flush({}, { status: 500, statusText: 'Err' });
    service.validate().subscribe({ error: () => undefined });
    http.expectOne(`${base}/api/cart/validate`).flush({}, { status: 500, statusText: 'Err' });

    auth.handleUnauthorized(false);
    expect(service.cart()).toBeNull();
    expect(service.itemCount()).toBe(0);
  });

  it('conserva la mutación confirmada frente a una lectura anterior y descarta errores de una sesión cerrada', () => {
    service.load();
    const oldRead = http.expectOne(`${base}/api/cart`);
    service.addProduct(313, 2).subscribe();
    http.expectOne(`${base}/api/cart/items`).flush(cartDto());
    oldRead.flush(cartDto([], { totalItems: 0 }));
    expect(service.itemCount()).toBe(2);
    expect(service.loading()).toBe(false);

    service.removeItem(50);
    const pending = http.expectOne(`${base}/api/cart/items/50`);
    auth.handleUnauthorized(false);
    pending.flush({ message: 'Respuesta de la sesión anterior' }, { status: 403, statusText: 'Forbidden' });
    expect(service.notice()).toBeNull();
    expect(service.cart()).toBeNull();
  });
});
