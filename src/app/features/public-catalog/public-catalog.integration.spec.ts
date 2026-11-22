import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, type HttpRequest } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Platform, provideIonicAngular } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMPACT_ENTER_SCROLL_TOP } from './adaptive-search-header';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { PUBLIC_CATALOG_ENABLED } from '../../core/repositories/public-catalog.repository';
import { categoryDto, productDto, productPage } from '../../core/api/public-catalog.testing';
import { PublicCatalogComponent } from './public-catalog.view';
import { PublicProductDetailComponent } from './public-product-detail.view';
import { HomePage } from '../home/home.page';
import { DemoCheckoutStateService } from '../../core/services/demo-checkout-state.service';
import { PublicImageComponent } from './public-product-grid.component';
import { PublicHomeComponent } from './public-home.view';

function flushDebouncedRequest(
  http: HttpTestingController,
  predicate: (req: HttpRequest<unknown>) => boolean,
  body: object,
): Promise<void> {
  return vi.waitFor(() => {
    http.expectOne(predicate).flush(body);
  }, { timeout: 2000, interval: 25 });
}

describe('Public HTTP catalog integration (explicit real mode)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<unknown>;
  const params = new BehaviorSubject(convertToParamMap({ id: '313' }));
  const query = new BehaviorSubject(convertToParamMap({}));
  beforeEach(() => {
    params.next(convertToParamMap({ id: '313' })); query.next(convertToParamMap({}));
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: 'http://localhost:8080' }, { provide: PUBLIC_CATALOG_ENABLED, useValue: true },
      { provide: ActivatedRoute, useValue: { paramMap: params, queryParamMap: query } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { fixture?.destroy(); http.verify(); });
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const settleSearch = () => new Promise(resolve => setTimeout(resolve, 250));
  it('renders the real home wrapper with category IDs, latest and featured', async () => {
    fixture = TestBed.createComponent(HomePage); fixture.detectChanges();
    expect(text()).toContain('Cargando instrumentos');
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([categoryDto]);
    http.expectOne(r => r.url.endsWith('/products/latest')).flush([productDto()]);
    http.expectOne(r => r.url.endsWith('/products/featured')).flush(productPage([productDto()], { size: 6 }));
    fixture.detectChanges(); await fixture.whenStable();
    expect(text()).toContain('Instrumento de prueba'); expect(text()).toContain('Explorar instrumentos'); expect(text()).toContain('Destacados disponibles');
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map(a => a.getAttribute('href'));
    expect(links).toContain('/main/catalog?categoryId=20'); expect(links).toContain('/products/313');
  });
  it('debounces fast filter changes, sends final query and renders empty pagination', async () => {
    fixture = TestBed.createComponent(PublicCatalogComponent); fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([categoryDto]);
    query.next(convertToParamMap({ q: 'gui' })); query.next(convertToParamMap({ q: 'guitarra', categoryId: '20', page: '1' }));
    await settleSearch();
    const req = http.expectOne(r => r.url.endsWith('/catalog'));
    expect(req.request.params.get('keyword')).toBe('guitarra'); expect(req.request.params.get('page')).toBe('1');
    req.flush(productPage([], { number: 1 })); fixture.detectChanges();
    expect(text()).toContain('No encontramos instrumentos'); expect(text()).toContain('Limpiar filtros');
  });
  it('renders catalogue errors and retry without switching to DEMO', async () => {
    fixture = TestBed.createComponent(PublicCatalogComponent); fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([]);
    await settleSearch(); http.expectOne(r => r.url.endsWith('/catalog')).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges(); expect(text()).toContain('No pudimos cargar el catálogo');
    (fixture.componentInstance as PublicCatalogComponent).service.retry();
    http.expectOne(r => r.url.endsWith('/catalog')).flush(productPage()); fixture.detectChanges();
    expect(text()).toContain('Instrumento de prueba');
  });
  it('marks only a real discount as an offer and preserves the product link', async () => {
    fixture = TestBed.createComponent(PublicCatalogComponent);
    fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([]);
    await settleSearch();
    http.expectOne(r => r.url.endsWith('/catalog')).flush(productPage([
      productDto({ id: 313, price: 6500, discountPrice: 5900, averageRating: 4.5, reviewCount: 2 }),
      productDto({ id: 314, price: 6500, discountPrice: null }),
    ]));
    fixture.detectChanges();
    const view: HTMLElement = fixture.nativeElement;
    const offer = view.querySelector('.product-offer');
    expect(offer?.textContent).toBe('Oferta');
    expect(view.querySelector('a[href="/products/313"] .rating')?.textContent).toContain('2 opiniones');
    expect(offer?.closest('a')?.getAttribute('href')).toBe('/products/313');
    expect(view.querySelector('a[href="/products/314"] .product-offer')).toBeNull();
  });

  it('shows real stock/price and plain text without adding to the DEMO cart', () => {
    const cart = TestBed.inject(DemoCheckoutStateService); const before = cart.cartItems();
    fixture = TestBed.createComponent(PublicProductDetailComponent); fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/313')).flush(productDto({ stock: 0, description: '<script>unsafe()</script>' }));
    fixture.detectChanges();
    expect(text()).toContain('Agotado'); expect(text()).toContain('6,500.00'); expect(text()).toContain('<script>unsafe()</script>');
    expect((fixture.nativeElement as HTMLElement).querySelector('script')).toBeNull();
    expect(text()).not.toMatch(/carrito DEMO|próxima etapa de integración/i);
    expect((fixture.nativeElement as HTMLElement).querySelector('.purchase-panel')).toBeNull();
    expect(cart.cartItems()).toEqual(before);
    expect(Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).some(b => b.textContent?.includes('Agregar'))).toBe(false);
  });
  it('renders 404 as not found', () => {
    fixture = TestBed.createComponent(PublicProductDetailComponent); fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/313')).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges(); expect(text()).toContain('Producto no encontrado');
  });
  it('rejects tampered route IDs before HTTP', () => {
    params.next(convertToParamMap({ id: '../private' })); fixture = TestBed.createComponent(PublicProductDetailComponent); fixture.detectChanges();
    http.expectNone(() => true); expect(text()).toContain('Producto no encontrado');
  });
  it('replaces broken images with an accessible placeholder', () => {
    const image = TestBed.createComponent(PublicImageComponent); fixture = image;
    image.componentRef.setInput('src', 'https://res.cloudinary.com/test/image.jpg'); image.componentRef.setInput('alt', 'Instrumento'); image.detectChanges();
    image.nativeElement.querySelector('img').dispatchEvent(new Event('error')); image.detectChanges();
    expect(image.nativeElement.querySelector('img')).toBeNull(); expect(image.nativeElement.textContent).toContain('Imagen no disponible');
  });
  it('resets pagination on filter edits, preserves URL filters on paging and clears explicitly', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const catalog = TestBed.createComponent(PublicCatalogComponent); fixture = catalog;
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([]);
    catalog.componentInstance.onCatalogSearchSubmitted('jarana');
    expect(navigate).toHaveBeenLastCalledWith(['/main/catalog'], { queryParams: { q: 'jarana', page: null }, queryParamsHandling: 'merge', replaceUrl: true });
    catalog.componentInstance.category('20');
    expect(navigate).toHaveBeenLastCalledWith(['/main/catalog'], { queryParams: { categoryId: '20', categoria: null, page: null }, queryParamsHandling: 'merge', replaceUrl: true });
    catalog.componentInstance.order('price_desc'); catalog.componentInstance.goPage(2);
    expect(navigate).toHaveBeenLastCalledWith(['/main/catalog'], { queryParams: { page: 2 }, queryParamsHandling: 'merge', replaceUrl: true });
    catalog.componentInstance.clear(); expect(navigate).toHaveBeenLastCalledWith(['/main/catalog'], { replaceUrl: true });
  });
  it('cancels an in-flight HTTP response when a later URL filter becomes active', async () => {
    fixture = TestBed.createComponent(PublicCatalogComponent); fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([]); await settleSearch();
    const stale = http.expectOne(r => r.url.endsWith('/catalog'));
    query.next(convertToParamMap({ q: 'new', categoryId: '20' })); await settleSearch();
    expect(stale.cancelled).toBe(true);
    const current = http.expectOne(r => r.url.endsWith('/catalog')); expect(current.request.params.get('keyword')).toBe('new');
    current.flush(productPage()); fixture.detectChanges(); expect(text()).toContain('Instrumento de prueba');
  });
  it('retries home failure and supports keyboard search without a commercial action', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const home = TestBed.createComponent(PublicHomeComponent); fixture = home; home.detectChanges();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([]);
    http.expectOne(r => r.url.endsWith('/products/latest')).flush([]);
    http.expectOne(r => r.url.endsWith('/products/featured')).flush({}, { status: 500, statusText: 'Error' });
    home.detectChanges(); expect(text()).toContain('No pudimos cargar Inicio');
    home.componentInstance.service.loadHome();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([]);
    http.expectOne(r => r.url.endsWith('/products/latest')).flush([]);
    http.expectOne(r => r.url.endsWith('/products/featured')).flush(productPage([], { size: 6 }));
    home.detectChanges(); expect(text()).toContain('Sin novedades'); expect(text()).toContain('Sin destacados');
    const input = home.nativeElement.querySelector('input') as HTMLInputElement; input.value = 'guitarra';
    input.dispatchEvent(new Event('input')); input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(navigate).toHaveBeenCalledWith(['/main/catalog'], { queryParams: { q: 'guitarra' } });
  });
  it('shows a recoverable detail error and unknown stock after retry', () => {
    const detail = TestBed.createComponent(PublicProductDetailComponent); fixture = detail; detail.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/313')).flush({}, { status: 500, statusText: 'Error' });
    detail.detectChanges(); expect(text()).toContain('No pudimos cargar el producto');
    detail.componentInstance.service.retryProduct();
    http.expectOne(r => r.url.endsWith('/products/313')).flush(productDto({ stock: null, imageUrl: null }));
    detail.detectChanges(); expect(text()).toContain('Disponibilidad por confirmar'); expect(text()).toContain('Imagen no disponible');
  });
});

describe('Encabezado adaptativo y búsqueda flotante (Inicio y Catálogo)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<unknown>;
  const params = new BehaviorSubject(convertToParamMap({ id: '313' }));
  const query = new BehaviorSubject(convertToParamMap({}));
  let backHandlers: Array<{ priority: number; handler: () => void; sub: Subscription }> = [];

  const emitScroll = (root: HTMLElement, scrollTop: number) => {
    const content = root.querySelector('ion-content');
    content?.dispatchEvent(new CustomEvent('ionScroll', { detail: { scrollTop }, bubbles: false }));
  };

  beforeEach(() => {
    backHandlers = [];
    params.next(convertToParamMap({ id: '313' }));
    query.next(convertToParamMap({}));
    const backButtonMock = {
      subscribeWithPriority: vi.fn((priority: number, handler: () => void) => {
        const sub = new Subscription();
        const entry = { priority, handler, sub };
        backHandlers.push(entry);
        return sub;
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIonicAngular({ animated: false }),
        { provide: API_BASE_URL, useValue: 'http://localhost:8080' },
        { provide: PUBLIC_CATALOG_ENABLED, useValue: true },
        { provide: ActivatedRoute, useValue: { paramMap: params, queryParamMap: query } },
        { provide: Platform, useValue: { backButton: backButtonMock, is: () => false, ready: () => Promise.resolve('dom') } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
  });

  it('Inicio muestra búsqueda superior inicial, activa compacto con histéresis y ubica la lupa a la izquierda de Favoritos', () => {
    const home = TestBed.createComponent(PublicHomeComponent);
    fixture = home;
    home.detectChanges();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([categoryDto]);
    http.expectOne(r => r.url.endsWith('/products/latest')).flush([productDto()]);
    http.expectOne(r => r.url.endsWith('/products/featured')).flush(productPage([productDto()], { size: 6 }));
    home.detectChanges();

    const root = home.nativeElement as HTMLElement;
    expect(home.componentInstance.header.isHeaderCompact()).toBe(false);
    const input = root.querySelector<HTMLInputElement>('.store-search-dock #home-search')!;
    expect(input).not.toBeNull();
    expect(root.querySelectorAll('#home-search')).toHaveLength(1);
    input.focus();
    home.detectChanges();
    expect(root.querySelector('#home-search')).toBe(input);
    expect(root.querySelector('.floating-search-panel, .floating-search-backdrop, .floating-search-close')).toBeNull();
    emitScroll(root, COMPACT_ENTER_SCROLL_TOP / 2);
    home.detectChanges();
    expect(root.style.getPropertyValue('--store-search-progress')).toBe('0.5');
    expect(home.componentInstance.header.isHeaderCompact()).toBe(false);

    const trigger = root.querySelector('.compact-search-trigger') as HTMLButtonElement;
    const favorites = root.querySelector('a[aria-label="Abrir Favoritos"]') as HTMLAnchorElement;
    expect(trigger.nextElementSibling).toBe(favorites);
    expect(trigger.getAttribute('aria-hidden')).toBe('true');
    expect(trigger.getAttribute('tabindex')).toBe('-1');

    emitScroll(root, COMPACT_ENTER_SCROLL_TOP + 32);
    home.detectChanges();
    expect(home.componentInstance.header.isHeaderCompact()).toBe(true);
    expect(root.querySelector('ion-header')?.classList.contains('is-compact')).toBe(true);
    expect(trigger.classList.contains('is-visible')).toBe(true);
    expect(trigger.getAttribute('aria-hidden')).toBeNull();
    expect(root.querySelectorAll('#home-search')).toHaveLength(0);

    // Banda de histéresis: sobre 70 px permanece compacto sin oscilar
    emitScroll(root, 70);
    home.detectChanges();
    expect(home.componentInstance.header.isHeaderCompact()).toBe(true);

    // Regresa al inicio: vuelve al estado expandido
    emitScroll(root, 20);
    home.detectChanges();
    expect(home.componentInstance.header.isHeaderCompact()).toBe(false);
  });

  it('Inicio abre búsqueda flotante sin navegar, conserva scrollTop, enfoca el campo y cierra con Escape, Atrás y pérdida de foco', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const home = TestBed.createComponent(PublicHomeComponent);
    fixture = home;
    document.body.appendChild(home.nativeElement);
    home.detectChanges();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([categoryDto]);
    http.expectOne(r => r.url.endsWith('/products/latest')).flush([]);
    http.expectOne(r => r.url.endsWith('/products/featured')).flush(productPage([], { size: 6 }));
    home.detectChanges();

    const root = home.nativeElement as HTMLElement;
    const trigger = root.querySelector('.compact-search-trigger') as HTMLButtonElement;

    emitScroll(root, 220);
    home.detectChanges();
    trigger.click();
    home.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(home.componentInstance.header.searchOverlayOpen()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#home-floating-search-panel')).not.toBeNull();
    expect(root.querySelectorAll('#home-search')).toHaveLength(1);
    expect(document.activeElement?.id).toBe('home-search');
    expect(home.componentInstance.header.scrollTop()).toBe(220);

    // Cierre con Escape devuelve foco al botón de lupa y preserva scrollTop
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    home.detectChanges();
    expect(home.componentInstance.header.searchOverlayOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(home.componentInstance.header.scrollTop()).toBe(220);

    // Cierre con botón Atrás de Android (prioridad 200)
    trigger.click();
    home.detectChanges();
    expect(backHandlers.at(-1)?.priority).toBe(200);
    backHandlers.at(-1)?.handler();
    home.detectChanges();
    expect(home.componentInstance.header.searchOverlayOpen()).toBe(false);
    expect(backHandlers.at(-1)?.sub.closed).toBe(true);
    expect(document.activeElement).toBe(trigger);

    // Pérdida de foco hacia un control del contenido
    trigger.click();
    home.detectChanges();
    expect(root.querySelector('.floating-search-backdrop')).toBeNull();
    root.querySelector('main a')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    (root.querySelector('main a') as HTMLElement).focus();
    home.detectChanges();
    expect(home.componentInstance.header.searchOverlayOpen()).toBe(false);
    expect(home.componentInstance.header.scrollTop()).toBe(220);
    home.nativeElement.remove();
  });

  it('Inicio ejecuta sugerencias predictivas en búsqueda flotante y al confirmar navega al Catálogo', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const home = TestBed.createComponent(PublicHomeComponent);
    fixture = home;
    home.detectChanges();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([]);
    http.expectOne(r => r.url.endsWith('/products/latest')).flush([]);
    http.expectOne(r => r.url.endsWith('/products/featured')).flush(productPage([], { size: 6 }));
    home.detectChanges();

    const root = home.nativeElement as HTMLElement;
    emitScroll(root, 180);
    home.detectChanges();
    (root.querySelector('.compact-search-trigger') as HTMLButtonElement).click();
    home.detectChanges();

    const input = root.querySelector('#home-floating-search-panel #home-search') as HTMLInputElement;
    input.value = 'jarana';
    input.dispatchEvent(new Event('input'));
    home.detectChanges();

    await flushDebouncedRequest(
      http,
      r => r.url.endsWith('/catalog') && r.params.get('keyword') === 'jarana' && r.params.get('size') === '5',
      productPage([productDto({ id: 313, name: 'Jarana Huasteca Artesanal' })]),
    );
    home.detectChanges();

    expect(root.querySelector('#home-floating-search-panel .suggestions')?.textContent).toContain('Jarana Huasteca Artesanal');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    home.detectChanges();
    expect(home.componentInstance.header.searchOverlayOpen()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/main/catalog'], { queryParams: { q: 'jarana' } });
  });

  it('Catálogo compacto ordena Filtros | Buscar | Favoritos, indica filtros reales y no duplica HTTP al abrir/cerrar búsqueda', async () => {
    query.next(convertToParamMap({ categoryId: '20', sortBy: 'price_asc' }));
    const catalog = TestBed.createComponent(PublicCatalogComponent);
    fixture = catalog;
    document.body.appendChild(catalog.nativeElement);
    catalog.detectChanges();
    http.expectOne(r => r.url.endsWith('/categories/active')).flush([categoryDto]);
    await flushDebouncedRequest(http, r => r.url.endsWith('/catalog'), productPage([productDto()]));
    catalog.detectChanges();

    const root = catalog.nativeElement as HTMLElement;
    emitScroll(root, 160);
    catalog.detectChanges();

    const actions = root.querySelector('.store-header-actions')!;
    const children = Array.from(actions.children) as HTMLElement[];
    expect(children[0].classList.contains('compact-filter-trigger')).toBe(true);
    expect(children[1].classList.contains('compact-search-trigger')).toBe(true);
    expect(children[2].getAttribute('aria-label')).toBe('Abrir Favoritos');
    expect(children[3].getAttribute('aria-label')).toBe('Abrir Perfil y Pedidos');
    expect(children[3].getAttribute('href')).toBe('/main/profile');

    // Indicador discreto con conteo real de filtros activos (categoría + orden = 2)
    expect(catalog.componentInstance.activeFilterCount()).toBe(2);
    expect(children[0].querySelector('.filter-count-badge')?.textContent?.trim()).toBe('2');
    expect(children[0].getAttribute('aria-label')).toContain('2 filtros activos');

    // Modal de filtros desde el botón compacto y restauración de foco
    children[0].click();
    catalog.detectChanges();
    expect(catalog.componentInstance.filtersOpen()).toBe(true);
    catalog.componentInstance.closeFilters();
    catalog.detectChanges();
    expect(catalog.componentInstance.filtersOpen()).toBe(false);
    expect(document.activeElement).toBe(children[0]);

    // Con término q ya activo, abrir y cerrar búsqueda flotante no dispara HTTP duplicados ni pierde la categoría
    query.next(convertToParamMap({ q: 'jarana', categoryId: '20' }));
    await flushDebouncedRequest(
      http,
      r => r.url.endsWith('/catalog') && r.params.get('keyword') === 'jarana',
      productPage([productDto()]),
    );
    catalog.detectChanges();

    children[1].click();
    catalog.detectChanges();
    const floatingInput = root.querySelector('#catalog-floating-search-panel #catalog-search') as HTMLInputElement;
    expect(floatingInput.value).toBe('jarana');
    expect(document.activeElement).toBe(floatingInput);
    expect(catalog.componentInstance.searchCategory()).toBe(20);
    await new Promise(r => setTimeout(r, 340));
    http.expectNone(() => true);

    floatingInput.value = 'guitarra';
    floatingInput.dispatchEvent(new Event('input'));
    catalog.detectChanges();
    await flushDebouncedRequest(
      http,
      r => r.url.endsWith('/catalog') && r.params.get('keyword') === 'guitarra'
        && r.params.get('size') === '5' && r.params.get('categoryId') === '20',
      productPage([productDto({ name: 'Guitarra clásica' })]),
    );
    expect(catalog.componentInstance.appliedTerm()).toBe('jarana');
    http.expectNone(r => r.url.endsWith('/catalog'));

    (root.querySelector('.floating-search-close') as HTMLButtonElement).click();
    catalog.detectChanges();
    expect(catalog.componentInstance.header.searchOverlayOpen()).toBe(false);
    expect(catalog.componentInstance.header.scrollTop()).toBe(160);
    http.expectNone(() => true);
    children[1].click();
    catalog.detectChanges();
    expect(root.querySelector('ion-content')?.classList.contains('is-search-open')).toBe(false);
    emitScroll(root, 220);
    catalog.detectChanges();
    expect(root.querySelector('.floating-search-panel')).toBeNull();
    children[1].click();
    catalog.detectChanges();
    catalog.componentInstance.ionViewWillLeave();
    catalog.detectChanges();
    expect(root.querySelector('.floating-search-panel')).toBeNull();

    emitScroll(root, 0);
    catalog.detectChanges();
    const reopened = root.querySelector('.store-search-dock #catalog-search') as HTMLInputElement;
    reopened.focus();
    catalog.detectChanges();
    expect(root.querySelector('#catalog-search')).toBe(reopened);
    expect(root.querySelector('.floating-search-panel, .floating-search-backdrop, .floating-search-close')).toBeNull();
    expect(root.querySelectorAll('input[type="search"]')).toHaveLength(1);
    expect(reopened.value).toBe('jarana');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation((_commands, options) => {
      query.next(convertToParamMap({ q: options?.queryParams?.['q'], categoryId: '20' }));
      return Promise.resolve(true);
    });
    reopened.value = 'gui';
    reopened.dispatchEvent(new Event('input'));
    catalog.detectChanges();
    await flushDebouncedRequest(
      http,
      r => r.url.endsWith('/catalog') && r.params.get('keyword') === 'gui'
        && r.params.get('size') === '5' && r.params.get('categoryId') === '20',
      productPage([productDto({ name: 'Guitarra sugerida' })]),
    );
    catalog.detectChanges();
    expect(reopened.closest('form')?.nextElementSibling?.textContent).toContain('Guitarra sugerida');
    expect(catalog.componentInstance.appliedTerm()).toBe('jarana');
    expect(navigate).not.toHaveBeenCalled();
    http.expectNone(r => r.url.endsWith('/catalog'));
    reopened.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    catalog.detectChanges();
    expect(reopened.value).toBe('jarana');
    expect(root.querySelector('.suggestions')).toBeNull();
    expect(document.activeElement).toBe(reopened);
    reopened.value = '  guitarra  ';
    reopened.dispatchEvent(new Event('input'));
    reopened.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    catalog.detectChanges();
    await flushDebouncedRequest(
      http,
      r => r.url.endsWith('/catalog') && r.params.get('keyword') === 'guitarra'
        && r.params.get('size') === '12' && r.params.get('categoryId') === '20',
      productPage([productDto()]),
    );
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/main/catalog'], {
      queryParams: { q: 'guitarra', page: null }, queryParamsHandling: 'merge', replaceUrl: true,
    });
    expect(catalog.componentInstance.appliedTerm()).toBe('guitarra');
    catalog.nativeElement.remove();
  });
});
