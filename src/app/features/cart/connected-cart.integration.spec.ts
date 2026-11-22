import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ConnectedCartComponent } from './connected-cart.view';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { cartDto, cartItemDto, testSession } from '../../core/api/auth.testing';
import { mapPublicProduct } from '../../core/api/public-product.mapper';
import { PublicProductGridComponent } from '../public-catalog/public-product-grid.component';
import { productDto } from '../../core/api/public-catalog.testing';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { MemorySessionStore } from '../../core/infrastructure/memory-session.store';
import { PUBLIC_CATALOG_ENABLED } from '../../core/repositories/public-catalog.repository';
import { authInterceptor } from '../../core/security/auth.interceptor';
import { SESSION_STORE } from '../../core/security/session-store.token';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { PurchaseIntentService } from '../../core/services/purchase-intent.service';
import { MainNavigationComponent } from '../../layout/main-navigation/main-navigation.component';
import { PublicProductDetailComponent } from '../public-catalog/public-product-detail.view';
import { CartPage } from './cart.page';

const base = 'https://api.example.test';

describe('carrito real conectado (integración)', () => {
  let http: HttpTestingController;
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      provideIonicAngular({ animated: false }), { provide: API_BASE_URL, useValue: base },
      { provide: SESSION_STORE, useValue: store }, { provide: BACKEND_SESSION_ENABLED, useValue: true },
      { provide: PUBLIC_CATALOG_ENABLED, useValue: true },
      { provide: ActivatedRoute, useValue: { paramMap: new BehaviorSubject(convertToParamMap({ id: '313' })) } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('detalle público: sin sesión redirige a login; con sesión agrega por productId y actualiza el badge', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const detail = TestBed.createComponent(PublicProductDetailComponent);
    detail.detectChanges();
    http.expectOne(`${base}/api/public/products/313`).flush(productDto());
    detail.detectChanges();

    detail.componentInstance.addToCart(313);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/products/313' } });
    http.expectNone(`${base}/api/cart/items`);

    await store.save(testSession());
    await TestBed.inject(AuthService).restore();
    const nav = TestBed.createComponent(MainNavigationComponent);
    nav.detectChanges();
    expect(nav.componentInstance.cartCount()).toBe(0);

    detail.componentInstance.addToCart(313);
    const refresh = http.expectOne(`${base}/api/public/products/313`);
    expect(refresh.request.method).toBe('GET');
    http.expectNone(`${base}/api/cart/items`);
    refresh.flush(productDto());
    const post = http.expectOne(`${base}/api/cart/items`);
    expect(post.request.body).toEqual({ productId: 313, quantity: 1 });
    const root = detail.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.favorite-button')).toHaveLength(1);
    expect(root.querySelector('.availability-actions .favorite-button')?.getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector('.product-gallery .favorite-button')).toBeNull();
    expect(root.querySelectorAll('cmc-quantity')).toHaveLength(1);
    expect(root.querySelector('ion-footer cmc-quantity')).not.toBeNull();
    const origin = root.querySelector('.purchase-panel cmc-button')!;
    const target = root.querySelector('.detail-cart')!;
    vi.spyOn(origin, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 100, 200, 48));
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(220, 20, 44, 44));
    const animate = vi.fn(() => ({ onfinish: null, cancel: vi.fn() }));
    const previousAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    try {
      vi.useFakeTimers();
      expect(document.querySelector('[data-cart-transfer]')).toBeNull();
      post.flush(cartDto());
      expect(animate).toHaveBeenCalledTimes(1);
    } finally {
      if (previousAnimate) Object.defineProperty(HTMLElement.prototype, 'animate', previousAnimate);
      else Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    }
    expect(TestBed.inject(PurchaseIntentService).take(313)).toBeNull();
    detail.detectChanges();
    nav.detectChanges();
    expect(detail.nativeElement.textContent).toContain('Producto agregado a tu carrito');
    expect(nav.componentInstance.cartBadgeText()).toBe('2');
    expect(detail.nativeElement.querySelector('.detail-cart').getAttribute('aria-label')).toContain('2');
    vi.advanceTimersByTime(3000);
    expect(detail.componentInstance.added()).toBe(false);
    expect(nav.componentInstance.cartBadgeText()).toBe('2');
  });

  it.each([403, 0])('describe una sola vez el fallo de agregar al carrito (HTTP %s)', async status => {
    await store.save(testSession());
    const auth = TestBed.inject(AuthService);
    await auth.restore();
    const page = TestBed.createComponent(PublicProductDetailComponent);
    page.detectChanges();
    http.expectOne(`${base}/api/public/products/313`).flush(productDto());
    http.expectOne(`${base}/api/wishlist`).flush({ items: [], totalItems: 0 });
    page.componentInstance.addToCart(313);
    http.expectOne(`${base}/api/public/products/313`).flush(productDto());
    const post = http.expectOne({ method: 'POST', url: `${base}/api/cart/items` });
    expect(post.request.headers.get('Authorization')?.startsWith('Bearer ')).toBe(true);
    if (status) post.flush({}, { status, statusText: 'Forbidden' });
    else post.error(new ProgressEvent('error'));
    page.detectChanges();
    const messages = (page.nativeElement as HTMLElement).querySelectorAll('.purchase-feedback [role="status"], .purchase-feedback [role="alert"]');
    expect(messages).toHaveLength(1);
    expect(messages[0].textContent).toContain(status ? 'No tienes permiso' : 'No se pudo conectar');
    if (status) expect(messages[0].textContent).not.toContain('conexión');
    expect(auth.hasValidSession()).toBe(true);
    expect(page.componentInstance.cart.itemCount()).toBe(0);
  });

  it('ante un 401 al agregar, vence la sesión y vuelve al login sin confirmar la compra', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await store.save(testSession());
    const auth = TestBed.inject(AuthService);
    await auth.restore();
    const page = TestBed.createComponent(PublicProductDetailComponent);
    page.detectChanges();
    http.expectOne(`${base}/api/public/products/313`).flush(productDto());
    http.expectOne(`${base}/api/wishlist`).flush({ items: [], totalItems: 0 });
    page.componentInstance.addToCart(313);
    http.expectOne(`${base}/api/public/products/313`).flush(productDto());
    http.expectOne({ method: 'POST', url: `${base}/api/cart/items` })
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.hasValidSession()).toBe(false);
    expect(auth.sessionExpired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    expect(page.componentInstance.added()).toBe(false);
  });

  it('conserva el corazón vacío al rechazar el alta y marcado al rechazar la baja', async () => {
    await store.save(testSession());
    await TestBed.inject(AuthService).restore();
    const grid = TestBed.createComponent(PublicProductGridComponent);
    grid.componentRef.setInput('products', [mapPublicProduct(productDto(), base)]);
    grid.detectChanges();
    http.expectOne({ method: 'GET', url: `${base}/api/wishlist` }).flush({ items: [], totalItems: 0 });
    grid.detectChanges();
    const heart: HTMLButtonElement = grid.nativeElement.querySelector('.card-favorite-btn');
    heart.click();
    http.expectOne({ method: 'POST', url: `${base}/api/wishlist` }).flush({}, { status: 403, statusText: 'Forbidden' });
    grid.detectChanges();
    expect(heart.getAttribute('aria-pressed')).toBe('false');
    expect(grid.nativeElement.querySelector('.favorite-notice')?.textContent).toContain('No tienes permiso');
    heart.click();
    http.expectOne({ method: 'POST', url: `${base}/api/wishlist` }).flush({
      wishlistId: 10, productId: 313, productName: 'Jarana', currentPrice: 6500, productImage: null, availableStock: 2,
    });
    grid.detectChanges();
    heart.click();
    http.expectOne({ method: 'DELETE', url: `${base}/api/wishlist/10` }).flush({}, { status: 403, statusText: 'Forbidden' });
    grid.detectChanges();
    expect(heart.getAttribute('aria-pressed')).toBe('true');
    expect(grid.nativeElement.querySelector('.favorite-notice')?.textContent).toContain('No tienes permiso');
  });

  it('confirma la nueva partida con una lectura si el POST devuelve una instantánea vacía', async () => {
    await store.save(testSession());
    await TestBed.inject(AuthService).restore();
    const cart = TestBed.inject(CartService);
    cart.addProduct(313, 1).subscribe();
    http.expectOne(`${base}/api/cart/items`).flush(cartDto([], { totalItems: 0 }));
    expect(cart.itemCount()).toBe(0);
    expect(cart.mutating()).toBe(true);
    http.expectOne(`${base}/api/cart`).flush(cartDto());
    expect(cart.itemCount()).toBe(2);
    expect(cart.mutating()).toBe(false);
    http.expectNone(`${base}/api/cart/items`);
  });

  it('favorito desde detalle exige sesión, no duplica el POST y presenta errores recuperables',async()=>{
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const f=TestBed.createComponent(PublicProductDetailComponent);f.detectChanges();http.expectOne(`${base}/api/public/products/313`).flush(productDto());
    f.componentInstance.addFavorite(313);expect(navigate).toHaveBeenCalledWith(['/login'],{queryParams:{returnUrl:'/products/313'}});http.expectNone(`${base}/api/wishlist`);
    await store.save(testSession());await TestBed.inject(AuthService).restore();
    f.componentInstance.addFavorite(313);f.componentInstance.addFavorite(313);const state=http.expectOne(`${base}/api/wishlist`);expect(state.request.method).toBe('GET');state.flush({items:[],totalItems:0});const req=http.expectOne(`${base}/api/wishlist`);expect(req.request.method).toBe('POST');expect(req.request.headers.has('Authorization')).toBe(true);
    vi.useFakeTimers();
    req.flush({wishlistId:10,productId:313,productName:'Jarana',currentPrice:6500,productImage:null,availableStock:2});f.detectChanges();expect(f.nativeElement.textContent).toContain('Producto guardado en favoritos');
    vi.advanceTimersByTime(3000);
    expect(f.componentInstance.favoriteNotice()).toBe('');
    expect(f.componentInstance.favoriteId()).toBe(10);
    f.componentInstance.addFavorite(313);const remove=http.expectOne(`${base}/api/wishlist/10`);expect(remove.request.method).toBe('DELETE');remove.flush({}, {status:503,statusText:'Unavailable'});expect(f.componentInstance.favoriteId()).toBe(10);expect(f.componentInstance.savingFavorite()).toBe(false);expect(f.componentInstance.favoriteNotice()).toContain('El servidor no pudo procesar');f.destroy();
  });

  it('redirige al visitante desde el corazón sin enviar una solicitud de favoritos', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const grid = TestBed.createComponent(PublicProductGridComponent);
    grid.componentRef.setInput('products', [mapPublicProduct(productDto(), base)]);
    grid.detectChanges();
    const heart: HTMLButtonElement = grid.nativeElement.querySelector('.card-favorite-btn');
    heart.click();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/products/313' } });
    http.expectNone(base + '/api/wishlist');
  });

  it('comparte una lista entre tarjetas y detalle y limpia los favoritos al cerrar sesión', async () => {
    await store.save(testSession());
    const auth = TestBed.inject(AuthService);
    await auth.restore();

    const grid = TestBed.createComponent(PublicProductGridComponent);
    grid.componentRef.setInput('products', [mapPublicProduct(productDto(), base)]);
    grid.detectChanges();
    const detail = TestBed.createComponent(PublicProductDetailComponent);
    http.expectOne(base + '/api/public/products/313').flush(productDto());
    const list = http.expectOne(base + '/api/wishlist');
    list.flush({ items: [], totalItems: 0 });
    grid.detectChanges();

    const heart: HTMLButtonElement = grid.nativeElement.querySelector('.card-favorite-btn');
    expect(heart.closest('a')).toBeNull();
    expect(grid.nativeElement.querySelector('a').getAttribute('href')).toBe('/products/313');
    heart.click();
    detail.componentInstance.addFavorite(313);
    const post = http.expectOne(base + '/api/wishlist');
    expect(post.request.body).toEqual({ productId: 313 });
    post.flush({ wishlistId: 10, productId: 313, productName: 'Jarana', currentPrice: 6500, productImage: null, availableStock: 2 });
    grid.detectChanges();
    expect(heart.getAttribute('aria-pressed')).toBe('true');
    expect(detail.componentInstance.favoriteId()).toBe(10);

    detail.componentInstance.addFavorite(313);
    const removal = http.expectOne(base + '/api/wishlist/10');
    auth.handleUnauthorized(false);
    expect(removal.cancelled).toBe(true);
    grid.detectChanges();
    expect(heart.getAttribute('aria-pressed')).toBe('false');
    expect(detail.componentInstance.favoriteId()).toBeNull();
  });

  it('pantalla de carrito: muestra importes del servidor, actualiza por itemId, valida antes de checkout y vacía', async () => {
    await store.save(testSession());
    await TestBed.inject(AuthService).restore();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const page = TestBed.createComponent(CartPage);
    page.detectChanges();
    http.expectOne(`${base}/api/cart`).flush(cartDto([cartItemDto({ availableStock: 3 })], { discount: 200, total: 14880, warningMessage: 'Stock limitado' }));
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Jarana Huasteca');
    expect(page.nativeElement.textContent).toContain('14,880.00');
    expect(page.nativeElement.textContent).toContain('Stock limitado');

    const view = page.debugElement.children[0].componentInstance;
    const root = page.nativeElement as HTMLElement;
    const summary = root.querySelector<HTMLElement>('ion-footer .cart-total')!;
    expect(root.querySelectorAll('.cart-total')).toHaveLength(1);
    expect(summary.querySelector('.summary-price strong')?.textContent).toContain('14,880.00');
    expect(summary.querySelector('#cart-breakdown')?.textContent).toContain('2,080.00');
    const scroll = (top: number) => {
      root.querySelector('ion-content')?.dispatchEvent(new CustomEvent('ionScroll', { detail: { scrollTop: top } }));
      page.detectChanges();
    };
    view.scrollLimit = 600;
    scroll(220);
    expect(summary.classList.contains('compact')).toBe(true);
    expect(summary.querySelector('#cart-breakdown')?.hasAttribute('hidden')).toBe(true);
    expect(summary.querySelector('.breakdown-toggle')).toBeNull();
    scroll(600);
    expect(summary.classList.contains('compact')).toBe(false);
    expect(summary.querySelector('#cart-breakdown')?.hasAttribute('hidden')).toBe(false);
    view.scrollLimit = 720;
    view.breakdownHeight = 120;
    scroll(580);
    expect(summary.classList.contains('compact')).toBe(false);
    scroll(500);
    expect(summary.classList.contains('compact')).toBe(true);

    view.changeQty(view.cart.cart()!.items[0], 1);
    page.detectChanges();
    expect(summary.textContent).toContain('Actualizando importes');
    expect(summary.textContent).not.toContain('14,880.00');
    const put = http.expectOne(`${base}/api/cart/items/50`);
    expect(put.request.body).toEqual({ itemId: 50, quantity: 3 });
    put.flush(cartDto([cartItemDto({ quantity: 3, availableStock: 3, subtotal: 19500 })],
      { totalItems: 3, subtotal: 19500, tax: 3120, total: 22620 }));
    page.detectChanges();
    expect(view.canIncrement(view.cart.cart()!.items[0])).toBe(false);
    expect(summary.querySelector('.summary-price strong')?.textContent).toContain('22,620.00');

    view.proceed();
    http.expectOne(`${base}/api/cart/validate`).flush({
      valid: false, canCheckout: false, globalErrors: ['Revisa existencias'],
      itemWarnings: [{ itemId: 50, productId: 313, availabilityStatus: 'LOW', warningMessage: 'Últimas piezas' }],
    });
    page.detectChanges();
    expect(navigate).not.toHaveBeenCalledWith(['/checkout']);
    expect(page.nativeElement.textContent).toContain('Revisa existencias');

    view.proceed();
    http.expectOne(`${base}/api/cart/validate`).flush({ valid: true, canCheckout: true, globalErrors: [], itemWarnings: [] });
    expect(navigate).toHaveBeenCalledWith(['/checkout']);

    const opener = root.querySelector<HTMLButtonElement>('.header-trash')!;
    const lower = root.querySelector<HTMLElement>('.clear-cart')!;
    opener.click();
    expect(view.clearOpen()).toBe(true);
    view.onClearClosed();
    http.expectNone(request => request.method === 'DELETE');

    lower.click();
    expect(view.clearOpen()).toBe(true);
    const dialog = view.clearDialog();
    vi.spyOn(dialog, 'close').mockImplementation(async () => {
      expect(dialog.busy()).toBe(false);
      view.onClearClosed();
    });
    const failed = view.confirmClear();
    const duplicate = view.confirmClear();
    expect(view.clearing()).toBe(true);
    const removeAll = (request: { url: string; method: string }) => request.url === `${base}/api/cart` && request.method === 'DELETE';
    http.expectOne(removeAll).flush({}, {status: 503, statusText: 'Unavailable'});
    await Promise.resolve();
    http.expectOne(`${base}/api/cart`).flush(cartDto());
    await Promise.all([failed, duplicate]);
    expect(view.clearOpen()).toBe(true);
    expect(view.clearError()).toContain('servidor');
    expect(view.cart.cart()?.items).toHaveLength(1);
    view.onClearClosed();
    lower.click();
    const cleared = view.confirmClear();
    page.detectChanges();
    expect(dialog.busy()).toBe(true);
    const empty = cartDto([], { totalItems: 0, subtotal: 0, tax: 0, total: 0 });
    http.expectOne(removeAll).flush({ message: 'ok' });
    await cleared;
    page.detectChanges();
    await page.whenStable();
    expect(view.clearOpen()).toBe(false);
    expect(view.cart.itemCount()).toBe(0);

    page.componentInstance.ionViewWillEnter();
    http.expectOne(`${base}/api/cart`).flush(empty);
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Tu carrito está vacío');
    expect(root.querySelector('.cart-footer')).toBeNull();
    expect(opener.disabled).toBe(true);
    view.goToCatalog();
    expect(navigate).toHaveBeenCalledWith(['/main/catalog']);
  });

  it('muestra importes pendientes sin inventar impuestos ni habilitar compra', async () => {
    await store.save(testSession());
    await TestBed.inject(AuthService).restore();
    const page = TestBed.createComponent(CartPage);
    page.detectChanges();
    const incomplete = cartDto();
    const withoutTax = { ...incomplete, tax: undefined };
    http.expectOne(`${base}/api/cart`).flush(withoutTax);
    page.detectChanges();
    const footer = (page.nativeElement as HTMLElement).querySelector('.cart-footer .cart-total')!;
    expect(footer.textContent).toContain('Importes por confirmar');
    expect(footer.textContent).toContain('Actualizar importes');
    expect(footer.textContent).not.toContain('Continuar compra');
    expect(footer.textContent).not.toContain('Impuestos');
    expect(footer.querySelector('.summary-price strong')).toBeNull();
  });

  it('confirma cantidades reales, conserva scroll al cancelar y muestra el aviso durante ocho segundos', async () => {
    await store.save(testSession());
    await TestBed.inject(AuthService).restore();
    const page = TestBed.createComponent(CartPage);
    page.detectChanges();
    http.expectOne(`${base}/api/cart`).flush(cartDto());
    page.detectChanges();
    const view = page.debugElement.query(By.directive(ConnectedCartComponent)).componentInstance as ConnectedCartComponent;
    const root = page.nativeElement as HTMLElement;
    const opener = root.querySelector<HTMLButtonElement>('.header-trash')!;
    vi.useFakeTimers();
    opener.click(); page.detectChanges();
    expect(view.clearOpen()).toBe(true);
    expect(view['clearSnapshot']?.items.length).toBe(1);
    expect(view['clearSnapshot']?.totalItems).toBe(2);
    view.onClearClosed();
    http.expectNone(r => r.method === 'DELETE');
    opener.click(); page.detectChanges();
    vi.spyOn(view.clearDialog()!, 'close').mockImplementation(async () => view.onClearClosed());
    const cleared = view.confirmClear();
    http.expectOne(r => r.url === `${base}/api/cart` && r.method === 'DELETE').flush({ message: 'ok' });
    await cleared;
    await vi.advanceTimersByTimeAsync(0);
    page.detectChanges();
    expect(view.clearedNotice()).toBe(true);
    expect(root.querySelector('.cart-feedback-footer')?.textContent).toContain('Carrito vaciado');
    expect(root.querySelector('.cart-total')).toBeNull();
    expect(root.querySelector('.empty-favorites')?.getAttribute('href')).toBe('/favorites');
    expect(root.textContent).not.toContain('Deshacer');
    vi.advanceTimersByTime(7999);
    expect(view.clearedNotice()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(view.clearedNotice()).toBe(false);
    page.destroy();
  });

});
