import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { PUBLIC_CATALOG_ENABLED } from '../../core/repositories/public-catalog.repository';
import { categoryDto, productDto, productPage } from '../../core/api/public-catalog.testing';
import { PublicCatalogComponent } from './public-catalog.view';
import { PublicProductDetailComponent } from './public-product-detail.view';
import { HomePage } from '../home/home.page';
import { DemoCheckoutStateService } from '../../core/services/demo-checkout-state.service';
import { PublicImageComponent } from './public-product-grid.component';
import { PublicHomeComponent } from './public-home.view';

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
    catalog.componentInstance.search('jarana');
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
