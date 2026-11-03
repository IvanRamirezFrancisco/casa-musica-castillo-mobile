import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { orderDto, orderPageDto, testSession } from '../../core/api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { MemorySessionStore } from '../../core/infrastructure/memory-session.store';
import { authInterceptor } from '../../core/security/auth.interceptor';
import { SESSION_STORE } from '../../core/security/session-store.token';
import { AuthService } from '../../core/services/auth.service';
import { OrdersPage } from './orders.page';
import { OrderDetailPage } from './order-detail/order-detail.page';

const base = 'https://api.example.test';

describe('pedidos reales conectados y aislamiento por usuario (integración)', () => {
  let http: HttpTestingController;
  let routeParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    const store = new MemorySessionStore();
    await store.save(testSession());
    routeParams = new BehaviorSubject(convertToParamMap({ id: '42' }));
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      provideIonicAngular({ animated: false }), { provide: API_BASE_URL, useValue: base },
      { provide: SESSION_STORE, useValue: store }, { provide: BACKEND_SESSION_ENABLED, useValue: true },
      { provide: ActivatedRoute, useValue: { paramMap: routeParams, snapshot: { paramMap: convertToParamMap({ id: '42' }) } } },
    ] });
    await TestBed.inject(AuthService).restore();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('historial paginado: muestra orderNumber, enlaza por id numérico y navega entre páginas', () => {
    const page = TestBed.createComponent(OrdersPage);
    page.detectChanges();
    const first = http.expectOne(`${base}/api/orders/my?page=0&size=10`);
    expect(first.request.headers.has('Authorization')).toBe(true);
    first.flush(orderPageDto([orderDto()], { totalElements: 20, totalPages: 2, last: false }));
    page.detectChanges();
    const text = page.nativeElement.textContent;
    expect(text).toContain('CMC-2026-0042');
    expect(text).toContain('Pedido: Confirmada');
    expect(text).toContain('Pago: Pagado');
    expect(text).toContain('Envío: Preparando Paquete');
    const link: HTMLAnchorElement | null = page.nativeElement.querySelector('a.card');
    expect(link?.getAttribute('href')).toBe('/orders/42');

    const view = page.debugElement.children[0].componentInstance;
    view.load(1);
    http.expectOne(`${base}/api/orders/my?page=1&size=10`).flush(orderPageDto([orderDto({ id: 43, orderNumber: 'CMC-2026-0043' })], { number: 1, totalElements: 20, totalPages: 2, first: false, last: true }));
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('CMC-2026-0043');

    page.componentInstance.ionViewWillEnter();
    http.expectOne(`${base}/api/orders/my?page=1&size=10`).flush({}, { status: 503, statusText: 'Unavailable' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('No pudimos cargar tus pedidos');

    TestBed.inject(AuthService).handleUnauthorized(false);
    expect(view.page()).toBeNull();
  });

  it('detalle y timeline: consulta /orders/my/{id} y /timeline, y rechaza IDs DEMO-* sin petición HTTP', () => {
    const detail = TestBed.createComponent(OrderDetailPage);
    detail.detectChanges();
    http.expectOne(`${base}/api/orders/my/42`).flush(orderDto({ discount: 100 }));
    http.expectOne(`${base}/api/orders/my/42/timeline`).flush([
      { id: 1, title: 'Pedido creado', description: 'Recibido', createdAt: '2026-10-27T18:00:00', actorLabel: 'Cliente' },
    ]);
    detail.detectChanges();
    expect(detail.nativeElement.textContent).toContain('CMC-2026-0042');
    expect(detail.nativeElement.textContent).toContain('Pedido creado');

    routeParams.next(convertToParamMap({ id: 'DEMO-44D41B9DF96C48E79AB24592' }));
    detail.detectChanges();
    http.expectNone(() => true);
    expect(detail.nativeElement.textContent).toContain('Pedido no encontrado');
    expect(detail.nativeElement.textContent).not.toContain('DEMO-44D41B9DF96C48E79AB24592');
  });

  it('aislamiento: 403/404 y un pedido con userId de otra cuenta nunca se muestran', () => {
    const detail = TestBed.createComponent(OrderDetailPage);
    detail.detectChanges();
    http.expectOne(`${base}/api/orders/my/42`).flush({ error: 'No tienes permiso' }, { status: 403, statusText: 'Forbidden' });
    expect(http.expectOne(`${base}/api/orders/my/42/timeline`).cancelled).toBe(true);
    detail.detectChanges();
    expect(detail.nativeElement.textContent).toContain('Pedido no encontrado');

    const view = detail.debugElement.children[0].componentInstance;
    view.reload();
    http.expectOne(`${base}/api/orders/my/42`).flush(orderDto({ userId: 999 }));
    expect(http.expectOne(`${base}/api/orders/my/42/timeline`).cancelled).toBe(true);
    detail.detectChanges();
    expect(view.order()).toBeNull();
    expect(detail.nativeElement.textContent).toContain('Pedido no encontrado');
    expect(detail.nativeElement.textContent).not.toContain('CMC-2026-0042');

    view.reload();
    http.expectOne(`${base}/api/orders/my/42`).flush({}, { status: 500, statusText: 'Err' });
    expect(http.expectOne(`${base}/api/orders/my/42/timeline`).cancelled).toBe(true);
    detail.detectChanges();
    expect(detail.nativeElement.textContent).toContain('No pudimos cargar el pedido');

    const back = vi.spyOn(TestBed.inject(NavController), 'navigateBack').mockResolvedValue(true);
    view.goBack();
    expect(back).toHaveBeenCalledWith(['/main/orders']);
  });
});
