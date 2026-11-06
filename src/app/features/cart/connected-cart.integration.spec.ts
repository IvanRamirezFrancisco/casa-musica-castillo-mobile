import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
  afterEach(() => http.verify());

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
    post.flush(cartDto());
    expect(TestBed.inject(PurchaseIntentService).take(313)).toBeNull();
    detail.detectChanges();
    nav.detectChanges();
    expect(detail.nativeElement.textContent).toContain('Producto agregado a tu carrito');
    expect(nav.componentInstance.cartBadgeText()).toBe('2');
  });

  it('favorito desde detalle exige sesión, no duplica el POST y presenta errores recuperables',async()=>{
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const f=TestBed.createComponent(PublicProductDetailComponent);f.detectChanges();http.expectOne(`${base}/api/public/products/313`).flush(productDto());
    f.componentInstance.addFavorite(313);expect(navigate).toHaveBeenCalledWith(['/login'],{queryParams:{returnUrl:'/products/313'}});http.expectNone(`${base}/api/wishlist`);
    await store.save(testSession());await TestBed.inject(AuthService).restore();
    f.componentInstance.addFavorite(313);f.componentInstance.addFavorite(313);const state=http.expectOne(`${base}/api/wishlist`);expect(state.request.method).toBe('GET');state.flush({items:[],totalItems:0});const req=http.expectOne(`${base}/api/wishlist`);expect(req.request.method).toBe('POST');expect(req.request.headers.has('Authorization')).toBe(true);
    req.flush({wishlistId:10,productId:313,productName:'Jarana',currentPrice:6500,productImage:null,availableStock:2});f.detectChanges();expect(f.nativeElement.textContent).toContain('Producto guardado en favoritos');
    f.componentInstance.addFavorite(313);const remove=http.expectOne(`${base}/api/wishlist/10`);expect(remove.request.method).toBe('DELETE');remove.flush({}, {status:503,statusText:'Unavailable'});expect(f.componentInstance.favoriteId()).toBe(10);expect(f.componentInstance.savingFavorite()).toBe(false);expect(f.componentInstance.favoriteNotice()).toContain('No se pudo');f.destroy();
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
    http.expectOne(`${base}/api/cart`).flush(cartDto([cartItemDto({ availableStock: 3 })], { discount: 200, warningMessage: 'Stock limitado' }));
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Jarana Huasteca');
    expect(page.nativeElement.textContent).toContain('15,080.00');
    expect(page.nativeElement.textContent).toContain('Stock limitado');

    const view = page.debugElement.children[0].componentInstance;
    view.changeQty(view.cart.cart()!.items[0], 1);
    const put = http.expectOne(`${base}/api/cart/items/50`);
    expect(put.request.body).toEqual({ itemId: 50, quantity: 3 });
    put.flush(cartDto([cartItemDto({ quantity: 3, availableStock: 3 })], { totalItems: 3 }));
    page.detectChanges();
    expect(view.canIncrement(view.cart.cart()!.items[0])).toBe(false);

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

    page.componentInstance.ionViewWillEnter();
    http.expectOne(`${base}/api/cart`).flush(cartDto([], { totalItems: 0 }));
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Tu carrito está vacío');
    view.goToCatalog();
    expect(navigate).toHaveBeenCalledWith(['/main/catalog']);
  });
});
