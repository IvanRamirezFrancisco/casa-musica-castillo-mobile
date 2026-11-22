import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { PUBLIC_CATALOG_REPOSITORY } from '../../core/repositories/public-catalog.repository';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { beforeEach,afterEach,describe,it,expect } from 'vitest';
import { ConnectedFavoritesComponent } from './connected-favorites.view';
import { HttpWishlistRepository,parseWishlistItem } from '../../core/infrastructure/http-wishlist.repository';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { AuthService } from '../../core/services/auth.service';
import { MemorySessionStore } from '../../core/infrastructure/memory-session.store';
import { SESSION_STORE } from '../../core/security/session-store.token';
import { authInterceptor } from '../../core/security/auth.interceptor';
import { testSession, fakeJwt, userDto } from '../../core/api/auth.testing';
import { productDto, productPage } from '../../core/api/public-catalog.testing';
import { mapPublicProduct } from '../../core/api/public-product.mapper';
import { ProductFavoritesService } from '../../core/services/product-favorites.service';
import { PublicProductGridComponent } from '../public-catalog/public-product-grid.component';
const item={wishlistId:10,productId:313,productName:'Jarana de prueba',currentPrice:6500,availableStock:3,available:true,productImage:null};
describe('Favoritos conectados (HTTP simulado)',()=>{
 let http:HttpTestingController;let repo:HttpWishlistRepository;const ended=new Subject<void>();
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:API_BASE_URL,useValue:'https://api.test'},{provide:BACKEND_SESSION_ENABLED,useValue:true},{provide:PUBLIC_CATALOG_REPOSITORY,useValue:{featured:()=>of({content:[]}),catalog:()=>of({content:[]})}},{provide:AuthService,useValue:{sessionEnded$:ended,sessionVersion:0,hasValidSession:()=>true,user:()=>({id:1})}}]});http=TestBed.inject(HttpTestingController);repo=TestBed.inject(HttpWishlistRepository);});
 afterEach(()=>http.verify());
 it('consulta, presenta precio/stock y elimina por wishlistId, después recarga',()=>{const f=TestBed.createComponent(ConnectedFavoritesComponent);http.expectOne('https://api.test/api/wishlist').flush({items:[item],totalItems:1});f.detectChanges();expect(f.nativeElement.textContent).toContain('Jarana de prueba');expect(f.nativeElement.textContent).toContain('6,500.00');f.nativeElement.querySelector('button').click();const del=http.expectOne('https://api.test/api/wishlist/10');expect(del.request.method).toBe('DELETE');f.componentInstance.remove(10);http.expectNone('https://api.test/api/wishlist/10');del.flush({message:'ok'});http.expectOne('https://api.test/api/wishlist').flush({items:[],totalItems:0});f.detectChanges();expect(f.nativeElement.textContent).toContain('Aún no tienes favoritos');f.destroy();});
 it('usa un fallback compacto accesible y limpia el aviso de retiro al cerrar sesión', () => {
   const fixture = TestBed.createComponent(ConnectedFavoritesComponent);
   http.expectOne('https://api.test/api/wishlist').flush({items:[{...item,productImage:null}],totalItems:1});
   fixture.detectChanges();
   const root = fixture.nativeElement as HTMLElement;
   const image = root.querySelector('[role="img"]');
   expect(image?.getAttribute('aria-label')).toContain('imagen no disponible');
   expect(image?.textContent).not.toContain('Imagen no disponible');
   const remove = root.querySelector<HTMLButtonElement>('button[aria-label^="Quitar"]')!;
   remove.click();
   http.expectOne('https://api.test/api/wishlist/10').flush({message:'ok'});
   http.expectOne('https://api.test/api/wishlist').flush({items:[],totalItems:0});
   fixture.detectChanges();
   expect(root.querySelector('[role="status"]')?.textContent).toContain('retirado');
   ended.next();
   fixture.detectChanges();
   expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
   fixture.destroy();
 });
 it('no anuncia disponibilidad por stock cuando el servidor deshabilitó el producto',()=>{const f=TestBed.createComponent(ConnectedFavoritesComponent);http.expectOne('https://api.test/api/wishlist').flush({items:[{...item,available:false}],totalItems:1});f.detectChanges();expect(f.nativeElement.textContent).toContain('No disponible');f.destroy();});
 it('error recuperable y cancelación de datos al cerrar sesión',()=>{const f=TestBed.createComponent(ConnectedFavoritesComponent);http.expectOne('https://api.test/api/wishlist').flush({}, {status:503,statusText:'Unavailable'});f.detectChanges();expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();f.nativeElement.querySelector('button').click();const pending=http.expectOne('https://api.test/api/wishlist');ended.next();expect(pending.cancelled).toBe(true);expect(f.componentInstance.items()).toEqual([]);f.destroy();});
 it('agrega exclusivamente productId real y valida respuesta',()=>{repo.add(313).subscribe(v=>expect(v.wishlistId).toBe(10));const req=http.expectOne('https://api.test/api/wishlist');expect(req.request.body).toEqual({productId:313});req.flush(item);expect(()=>repo.add(0)).toThrow();expect(()=>repo.remove(-1)).toThrow();});
 it.each([null,{}, {...item,currentPrice:-1},{...item,currentPrice:'50'},{...item,availableStock:-1},{...item,productId:1.2},{...item,productImage:4}])('rechaza JSON inválido %#',v=>expect(()=>parseWishlistItem(v,'https://api.test')).toThrow());
 it('no interpreta HTML remoto y filtra imágenes externas inseguras',()=>{const mapped=parseWishlistItem({...item,productName:'<script>test</script>',productImage:'javascript:test'},'https://api.test');expect(mapped.productImage).toBeNull();expect(mapped.productName).toContain('<script>');});
 it('rechaza totales incoherentes y no oculta un error de eliminación',()=>{repo.list().subscribe({error:e=>expect(e.kind).toBe('invalid-response')});http.expectOne('https://api.test/api/wishlist').flush({items:[item],totalItems:0});const f=TestBed.createComponent(ConnectedFavoritesComponent);http.expectOne('https://api.test/api/wishlist').flush({items:[item],totalItems:1});f.componentInstance.remove(10);http.expectOne('https://api.test/api/wishlist/10').flush({}, {status:403,statusText:'Forbidden'});expect(f.componentInstance.items()).toHaveLength(1);expect(f.componentInstance.loading()).toBe(false);f.destroy();});
});


describe('Favoritos compartidos, recomendaciones y aislamiento de sesión', () => {
  const base = 'https://api.example.test';
  let http: HttpTestingController;
  let auth: AuthService;
  let favorites: ProductFavoritesService;
  let view: ComponentFixture<ConnectedFavoritesComponent>;

  beforeEach(async () => {
    const store = new MemorySessionStore();
    await store.save(testSession());
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideIonicAngular({ animated: false }),
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: base }, { provide: BACKEND_SESSION_ENABLED, useValue: true },
      { provide: SESSION_STORE, useValue: store },
    ] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    await auth.restore();
    favorites = TestBed.inject(ProductFavoritesService);
  });
  afterEach(() => { view?.destroy(); http.verify(); });

  it('recomienda productos reales y confirma el primer favorito con un POST sin navegar ni duplicar listas', () => {
    view = TestBed.createComponent(ConnectedFavoritesComponent);
    const list = http.expectOne(`${base}/api/wishlist`);
    expect(list.request.headers.get('Authorization')).toContain('Bearer ');
    list.flush({ items: [], totalItems: 0 });
    view.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/featured')).flush(productPage([productDto()]));
    view.detectChanges();
    const root = view.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Aún no tienes favoritos');
    expect(root.textContent).toContain('Podrían gustarte');
    const favorite = root.querySelector<HTMLButtonElement>('.card-favorite-btn')!;
    favorite.click(); favorite.click();
    const post = http.expectOne(r => r.method === 'POST' && r.url === `${base}/api/wishlist`);
    expect(post.request.body).toEqual({ productId: 313 });
    expect(favorites.id(313)).toBeNull();
    post.flush(item);
    view.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/catalog') && r.params.get('size') === '50').flush(productPage([productDto()]));
    view.detectChanges();
    expect(favorites.id(313)).toBe(10);
    expect(view.componentInstance.items()).toBe(favorites.items());
    expect(root.querySelector('.favorites-empty')).toBeNull();
    expect(root.querySelectorAll('.favorite-card')).toHaveLength(1);
    expect(root.querySelector('.favorite-link')?.getAttribute('href')).toBe('/products/313');
    http.expectNone(r => r.method === 'GET' && r.url === `${base}/api/wishlist`);
  });

  it('separa errores de recomendaciones, consulta y eliminación sin marcar un éxito rechazado', () => {
    view = TestBed.createComponent(ConnectedFavoritesComponent);
    http.expectOne(`${base}/api/wishlist`).flush({ items: [], totalItems: 0 });
    view.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/featured')).flush({}, { status: 503, statusText: 'Unavailable' });
    view.detectChanges();
    expect(view.nativeElement.querySelector('.favorites-empty')).not.toBeNull();
    expect(view.nativeElement.querySelector('.favorites-recommendations')).toBeNull();
    expect(view.nativeElement.querySelector('[role=alert]')).toBeNull();
    favorites.toggle(313);
    http.expectOne(r => r.method === 'POST').flush(item);
    view.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/catalog')).flush({}, { status: 503, statusText: 'Unavailable' });
    view.detectChanges();
    view.componentInstance.remove(10); view.componentInstance.remove(10);
    const remove = http.expectOne(`${base}/api/wishlist/10`);
    expect(remove.request.method).toBe('DELETE');
    expect(favorites.id(313)).toBe(10);
    remove.flush({}, { status: 403, statusText: 'Forbidden' });
    view.detectChanges();
    expect(favorites.id(313)).toBe(10);
    expect(view.nativeElement.querySelectorAll('.favorite-card')).toHaveLength(1);
    expect(view.nativeElement.querySelectorAll('[role=alert]')).toHaveLength(1);
    expect(view.nativeElement.textContent).toContain('No tienes permiso');
    view.componentInstance.remove(999999);
    http.expectNone(`${base}/api/wishlist/999999`);
  });

  it('muestra los importes de Wishlist y disponibilidad real aun cuando el catálogo tenga otro precio', () => {
    view = TestBed.createComponent(ConnectedFavoritesComponent);
    const items = [item, { ...item, wishlistId: 11, productId: 314, availableStock: 0 },
      { ...item, wishlistId: 12, productId: 315, available: false }];
    http.expectOne(`${base}/api/wishlist`).flush({ items, totalItems: 3 });
    view.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/catalog')).flush(productPage([productDto({ price: 9999 })]));
    view.detectChanges();
    const root = view.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.favorite-card')).toHaveLength(3);
    expect(root.querySelector('.favorite-price')?.textContent).toContain('6,500');
    expect(root.querySelector('.favorite-price')?.textContent).not.toContain('9,999');
    expect(root.textContent).toContain('3 instrumentos guardados');
    expect(root.textContent).toContain('Agotado');
    expect(root.textContent).toContain('No disponible');
    expect(root.querySelectorAll('[role=img]')).toHaveLength(3);
  });

  it('cancela respuestas tardías de la cuenta anterior y comparte el nuevo estado con las tarjetas', async () => {
    view = TestBed.createComponent(ConnectedFavoritesComponent);
    http.expectOne(`${base}/api/wishlist`).flush({ items: [item], totalItems: 1 });
    view.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/catalog')).flush(productPage([]));
    const grid = TestBed.createComponent(PublicProductGridComponent);
    grid.componentRef.setInput('products', [mapPublicProduct(productDto(), base)]);
    grid.detectChanges();
    expect(grid.nativeElement.querySelector('.card-favorite-btn')?.getAttribute('aria-pressed')).toBe('true');
    expect(favorites.id(313)).toBe(10);
    view.componentInstance.remove(10);
    const oldDelete = http.expectOne(`${base}/api/wishlist/10`);
    auth.handleUnauthorized(false);
    expect(oldDelete.cancelled).toBe(true);
    expect(favorites.items()).toEqual([]);
    expect(view.componentInstance.items()).toEqual([]);
    const signedIn = firstValueFrom(auth.login({ email: 'otra@example.test', password: 'Synthetic-only' }));
    http.expectOne(`${base}/api/auth/login`).flush({ success: true, data: { jwtResponse: { accessToken: fakeJwt(undefined, { sub: '8' }), user: userDto({ id: 8 }) } } });
    await signedIn;
    view.detectChanges();
    http.expectOne(`${base}/api/wishlist`).flush({ items: [], totalItems: 0 });
    view.detectChanges();
    http.expectOne(r => r.url.endsWith('/products/featured')).flush(productPage([]));
    expect(auth.hasValidSession()).toBe(true);
    expect(favorites.id(313)).toBeNull();
    grid.detectChanges();
    expect(grid.nativeElement.querySelector('.card-favorite-btn')?.getAttribute('aria-pressed')).toBe('false');
    grid.destroy();
  });
});
