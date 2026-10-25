import { firstValueFrom, filter, timeout } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { provideRouter, Router, RouteReuseStrategy, NavigationEnd } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { routes } from './app.routes';
import { CatalogPage } from './features/catalog/catalog.page';
import { ProductDetailPage } from './features/catalog/product-detail/product-detail.page';
import { FavoritesPage } from './features/favorites/favorites.page';
import { NotFoundPage } from './features/not-found/not-found.page';
import { MainNavigationComponent } from './layout/main-navigation/main-navigation.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

// Real production route definitions and lazy pages, no mocked Router.navigate.
describe('TT-04 routing real', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(),
        provideIonicAngular({ animated: false }),
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
    });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
  });
  const rendered = () => harness.routeNativeElement?.textContent ?? '';
  const child = <T>(type: new (...args: never[]) => T): T => {
    const debug: DebugElement | null = harness.routeDebugElement?.query(By.directive(type)) ?? null;
    expect(debug).not.toBeNull();
    return debug!.componentInstance as T;
  };
  const settle = async () => {
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  const historyChange = async (action: () => void) => {
    const completed = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd), timeout(3000)));
    action();
    await completed;
    await settle();
  };

  it.each([
    ['/', '/splash', 'Casa de Música'],
    ['/splash', '/splash', 'Casa de Música'],
    ['/main', '/main/home', 'Casa de Música'],
    ['/main/home', '/main/home', 'Casa de Música'],
    ['/main/catalog', '/main/catalog', 'Catálogo'],
    ['/main/cart', '/main/cart', 'Carrito'],
    ['/main/orders', '/main/orders', 'Mis pedidos'],
    ['/main/profile', '/main/profile', 'Perfil'],
    ['/profile/edit', '/profile/edit', 'Editar perfil'],
    ['/checkout', '/checkout', 'Finalizar compra'],
    ['/checkout/delivery', '/checkout/delivery', 'Método de entrega'],
    ['/checkout/payment', '/checkout/payment', 'Método de pago'],
    ['/login', '/login', 'Bienvenido de nuevo'],
    ['/register', '/register', 'Crea tu cuenta'],
    ['/forgot-password', '/forgot-password', 'Recuperar acceso'],
  ])('activa %s con su página real', async (url, expected, text) => {
    await harness.navigateByUrl(url);
    await settle();
    expect(router.url).toBe(expected);
    expect(rendered()).toContain(text);
  });

  it('mantiene cinco tabs y activa sus destinos reales', async () => {
    await harness.navigateByUrl('/main/home', MainNavigationComponent);
    await settle();
    const tabs = harness.routeNativeElement!.querySelectorAll('ion-tab-button');
    expect(tabs).toHaveLength(5);
    for (const name of ['home', 'catalog', 'cart', 'orders', 'profile']) {
      await router.navigateByUrl(`/main/${name}`);
      await settle();
      expect(router.routerState.snapshot.root.firstChild?.firstChild?.routeConfig?.path).toBe(name);
    }
  });

  it.each(['', '   ', 'eléctrica', 'A&B + # / ? = %', '<script>alert(1)</script>'])(
    'serializa q como texto público: %s', async q => {
      await harness.navigateByUrl('/main/catalog');
      await settle();
      const catalog = child(CatalogPage);
      catalog.onBusquedaChange(q);
      await settle();
      expect(router.parseUrl(router.url).queryParams['q'] ?? '').toBe(q);
      expect(catalog.busqueda()).toBe(q);
      if (!q.trim()) expect(catalog.productosFiltrados()).toHaveLength(8);
      expect(harness.routeNativeElement!.querySelector('script')).toBeNull();
    });

  it('combina filtros, ignora categorías manipuladas y limpia la URL', async () => {
    await harness.navigateByUrl('/main/catalog?q=eléctrica&categoria=Guitarras');
    await settle();
    const catalog = child(CatalogPage);
    expect(catalog.productosFiltrados().map(p => p.id)).toEqual([5]);
    catalog.limpiarFiltros();
    await settle();
    expect(router.url).toBe('/main/catalog');
    expect(catalog.productosFiltrados()).toHaveLength(8);
    catalog.seleccionarCategoria('Teclados');
    await settle();
    expect(router.parseUrl(router.url).queryParams['categoria']).toBe('Teclados');
    await router.navigateByUrl('/main/catalog?categoria=%3Cscript%3E');
    await settle();
    expect(catalog.categoriaActiva()).toBe('Todos');
  });

  it('restaura filtros por atrás/adelante y no agrega una entrada por pulsación', async () => {
    await harness.navigateByUrl('/main/home');
    await harness.navigateByUrl('/main/catalog');
    await settle();
    const catalog = child(CatalogPage);
    catalog.onBusquedaChange('eléctrica');
    await settle();
    catalog.seleccionarCategoria('Guitarras');
    await settle();
    const location = TestBed.inject(Location);
    await historyChange(() => location.back());
    expect(router.url).toBe('/main/home');
    await historyChange(() => location.forward());
    expect(router.parseUrl(router.url).queryParams).toEqual({ q: 'eléctrica', categoria: 'Guitarras' });
    expect(child(CatalogPage).productosFiltrados().map(p => p.id)).toEqual([5]);
  });

  it('abre el producto desde el enlace del catálogo y conserva la URL de origen', async () => {
    await harness.navigateByUrl('/main/catalog?q=yamaha&categoria=Guitarras');
    await settle();
    const link = harness.routeNativeElement!.querySelector('.detail-btn') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/products/1');
    link.click(); await settle();
    expect(router.url).toBe('/products/1');
    expect(rendered()).toContain('Guitarra acústica de estudio');
    await historyChange(() => TestBed.inject(Location).back());
    expect(router.parseUrl(router.url).queryParams).toEqual({ q: 'yamaha', categoria: 'Guitarras' });
  });

  it.each(['0', '-1', '1.5', 'abc', 'p1', '01', '9007199254740992', '999', '%3Cscript%3E'])(
    'controla producto inválido o inexistente %s', async id => {
      const page = await harness.navigateByUrl(`/products/${id}`, ProductDetailPage);
      expect(page.product()).toBeNull();
      expect(rendered()).toContain('Producto no encontrado');
    });

  it('resuelve un ID válido y cambios consecutivos de ID', async () => {
    const first = await harness.navigateByUrl('/products/1', ProductDetailPage);
    expect(first.product()?.id).toBe(1);
    const second = await harness.navigateByUrl('/products/2', ProductDetailPage);
    expect(second.product()?.id).toBe(2);
  });

  it('Favoritos declara su alcance y un destino seguro de regreso directo', async () => {
    await harness.navigateByUrl('/favorites', FavoritesPage);
    expect(rendered()).toContain('no se guardan ni se comparten');
    expect(harness.routeNativeElement!.querySelector('ion-back-button')?.getAttribute('defaultHref')).toBe('/main/home');
    (harness.routeNativeElement!.querySelector('a') as HTMLAnchorElement).click();
    await settle();
    expect(router.url).toBe('/main/catalog');
  });

  it('detalle de producto ofrece regreso seguro sin historial', async () => {
    await harness.navigateByUrl('/products/1', ProductDetailPage);
    expect(harness.routeNativeElement!.querySelector('ion-back-button')?.getAttribute('defaultHref')).toBe('/main/catalog');
    (harness.routeNativeElement!.querySelector('ion-back-button') as HTMLElement).click();
    await settle();
    expect(router.url).toBe('/main/catalog');
  });

  it('abre pedido desde el listado y regresa con dirección Ionic back', async () => {
    await harness.navigateByUrl('/main/orders'); await settle();
    await new Promise(resolve => setTimeout(resolve, 450));
    harness.detectChanges();
    const link = harness.routeNativeElement!.querySelector('.order-card') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/orders/DEMO-1004');
    link.click(); await settle();
    expect(router.url).toBe('/orders/DEMO-1004');
    await new Promise(resolve => setTimeout(resolve, 450)); harness.detectChanges();
    expect(rendered()).toContain('DEMO-1004');
    (harness.routeNativeElement!.querySelector('.nav-back-btn') as HTMLButtonElement).click();
    await settle(); expect(router.url).toBe('/main/orders');
  });

  it('controla un pedido inválido al entrar directamente', async () => {
    await harness.navigateByUrl('/orders/INVALID%3C'); await settle();
    expect(rendered()).toContain('Pedido no encontrado');
    (harness.routeNativeElement!.querySelector('.nav-back-btn') as HTMLButtonElement).click();
    await settle(); expect(router.url).toBe('/main/orders');
  });

  it.each([
    ['/profile/edit', '/main/profile'],
    ['/checkout', '/main/cart'],
    ['/checkout/delivery', '/checkout'],
    ['/checkout/payment', '/checkout'],
  ])('retorno secundario directo %s → %s', async (url, destination) => {
    await harness.navigateByUrl(url); await settle();
    (harness.routeNativeElement!.querySelector('.nav-back-btn') as HTMLButtonElement).click();
    await settle(); expect(router.url).toBe(destination);
  });

  it('Favoritos vuelve a Inicio cuando se abre sin historial Ionic', async () => {
    await harness.navigateByUrl('/favorites');
    (harness.routeNativeElement!.querySelector('ion-back-button') as HTMLElement).click();
    await settle(); expect(router.url).toBe('/main/home');
  });

  it('entrada directa a confirmación incompleta vuelve al resumen', async () => {
    await harness.navigateByUrl('/checkout/confirmation'); await settle();
    expect(router.url).toBe('/checkout');
    expect(rendered()).not.toContain('¡Pedido Confirmado!');
  });

  it.each(['/not-found', '/ruta-inexistente', '/main/inexistente', '/products', '/orders', '/checkout/inexistente'])(
    'muestra NotFound sin ocultar la URL %s', async url => {
      await harness.navigateByUrl(url, NotFoundPage);
      expect(router.url).toBe(url);
      expect(rendered()).toContain('Página no encontrada');
      (harness.routeNativeElement!.querySelector('a') as HTMLAnchorElement).click();
      await settle(); expect(router.url).toBe('/main/home');
    });
});
