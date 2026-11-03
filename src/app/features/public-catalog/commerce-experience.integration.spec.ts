import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { productDto, productPage, categoryDto } from '../../core/api/public-catalog.testing';
import { cartDto, testSession } from '../../core/api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { PUBLIC_CATALOG_ENABLED } from '../../core/repositories/public-catalog.repository';
import { MemorySessionStore } from '../../core/infrastructure/memory-session.store';
import { SESSION_STORE } from '../../core/security/session-store.token';
import { authInterceptor } from '../../core/security/auth.interceptor';
import { AuthService } from '../../core/services/auth.service';
import { PurchaseIntentService } from '../../core/services/purchase-intent.service';
import { HttpReviewRepository, parseReview, parseReviewPage } from '../../core/infrastructure/http-review.repository';
import { PublicProductDetailComponent } from './public-product-detail.view';
import { ProductReviewsComponent } from './product-reviews.component';
import { PublicCatalogComponent } from './public-catalog.view';
import { PublicHomeComponent } from './public-home.view';
import { mapPublicProduct } from '../../core/api/public-product.mapper';
import { parseProduct } from '../../core/api/public-catalog.validation';

const base='https://api.test';
const review={reviewId:1,productId:313,rating:5,title:'Buen instrumento',comment:'Una experiencia de prueba controlada.',userName:'Músico de prueba',createdAt:'2026-10-29T10:00:00',verifiedPurchase:true};
const reviewPage=(reviews:unknown[]=[])=>({reviews,totalReviews:reviews.length,currentPage:0,totalPages:reviews.length?1:0,statistics:null});
const favorite={wishlistId:10,productId:313,productName:'Jarana',currentPrice:6500,productImage:null,availableStock:5};

describe('Experiencia comercial móvil: HTTP controlado, nunca backend real',()=>{
 let http:HttpTestingController;let store:MemorySessionStore;let fixtures:ComponentFixture<unknown>[];
 const params=new BehaviorSubject(convertToParamMap({id:'313'}));const query=new BehaviorSubject(convertToParamMap({}));
 beforeEach(()=>{fixtures=[];store=new MemorySessionStore();params.next(convertToParamMap({id:'313'}));query.next(convertToParamMap({}));TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(withInterceptors([authInterceptor])),provideHttpClientTesting(),provideIonicAngular({animated:false}),{provide:API_BASE_URL,useValue:base},{provide:SESSION_STORE,useValue:store},{provide:BACKEND_SESSION_ENABLED,useValue:true},{provide:PUBLIC_CATALOG_ENABLED,useValue:true},{provide:ActivatedRoute,useValue:{paramMap:params,queryParamMap:query}}]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>{fixtures.forEach(f=>f.destroy());http.verify();});
 async function signIn(){await store.save(testSession());await TestBed.inject(AuthService).restore();}
 function detail(items:unknown[]=[],patch:Parameters<typeof productDto>[0]={}){const f=TestBed.createComponent(PublicProductDetailComponent);fixtures.push(f);f.detectChanges();http.expectOne(base+'/api/public/products/313').flush(productDto(patch));if(TestBed.inject(AuthService).hasValidSession())http.expectOne(base+'/api/wishlist').flush({items,totalItems:items.length});f.detectChanges();return f;}
 function reviews(){const f=TestBed.createComponent(ProductReviewsComponent);fixtures.push(f);f.componentRef.setInput('productId',313);f.detectChanges();return f;}

 it('conserva intención de invitado por diez minutos, exige confirmación y no escribe al restaurar sesión',async()=>{
  const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);const f=detail();f.componentInstance.quantity.set(3);f.componentInstance.addToCart(313);expect(navigate).toHaveBeenCalledWith(['/login'],{queryParams:{returnUrl:'/products/313'}});http.expectNone(base+'/api/cart/items');f.destroy();fixtures=[];
  await signIn();const resumed=detail();expect(resumed.componentInstance.quantity()).toBe(3);http.expectNone(base+'/api/cart/items');expect(TestBed.inject(PurchaseIntentService).take(313)).toBeNull();
 });
 it('revalida una sola vez por doble toque y envía la cantidad sin precios de cliente',async()=>{
  await signIn();const f=detail();f.componentInstance.quantity.set(2);f.componentInstance.addToCart(313);f.componentInstance.addToCart(313);http.expectOne(base+'/api/public/products/313').flush(productDto());const post=http.expectOne(base+'/api/cart/items');expect(post.request.body).toEqual({productId:313,quantity:2});expect(post.request.headers.has('Authorization')).toBe(true);post.flush(cartDto());f.detectChanges();expect(f.nativeElement.textContent).toContain('Producto agregado');expect(f.componentInstance.preparing()).toBe(false);
 });
 it.each([{stock:0},{stock:1},{price:7000,discountPrice:null}])('cambio de stock o precio exige revisión antes de escribir %#',async patch=>{
  await signIn();const f=detail();f.componentInstance.quantity.set(2);f.componentInstance.addToCart(313);http.expectOne(base+'/api/public/products/313').flush(productDto(patch));http.expectNone(base+'/api/cart/items');expect(f.componentInstance.actionNotice()).not.toBe('');expect(f.componentInstance.preparing()).toBe(false);
 });
 it.each([0,101,1.5,NaN])('no envía una cantidad inválida %s',quantity=>{const f=detail();f.componentInstance.quantity.set(quantity);f.componentInstance.addToCart(313);http.expectNone(base+'/api/cart/items');expect(f.componentInstance.actionNotice()).toContain('cantidad');});
 it('error de revalidación es recuperable y logout cancela la operación en curso',async()=>{
  await signIn();const f=detail();f.componentInstance.addToCart(313);http.expectOne(base+'/api/public/products/313').flush({}, {status:503,statusText:'Unavailable'});expect(f.componentInstance.preparing()).toBe(false);expect(f.componentInstance.actionNotice()).toContain('No pudimos');f.componentInstance.addToCart(313);const pending=http.expectOne(base+'/api/public/products/313');TestBed.inject(AuthService).handleUnauthorized(false);expect(pending.cancelled).toBe(true);expect(f.componentInstance.preparing()).toBe(false);http.expectNone(base+'/api/cart/items');
 });
 it('cambia la ruta durante la revalidación sin escribir el producto anterior',async()=>{
  await signIn();const f=detail();f.componentInstance.addToCart(313);const pending=http.expectOne(base+'/api/public/products/313');params.next(convertToParamMap({id:'314'}));expect(pending.cancelled).toBe(true);http.expectOne(base+'/api/public/products/314').flush(productDto({id:314}));http.expectOne(base+'/api/wishlist').flush({items:[],totalItems:0});http.expectNone(base+'/api/cart/items');
 });
 it('consulta favoritos existentes, elimina por wishlistId y vuelve a agregar por productId',async()=>{
  await signIn();const f=detail([favorite]);expect(f.componentInstance.favoriteId()).toBe(10);f.componentInstance.addFavorite(313);f.componentInstance.addFavorite(313);const remove=http.expectOne(base+'/api/wishlist/10');expect(remove.request.method).toBe('DELETE');remove.flush({message:'ok'});expect(f.componentInstance.favoriteId()).toBeNull();f.componentInstance.addFavorite(313);const add=http.expectOne(base+'/api/wishlist');expect(add.request.body).toEqual({productId:313});add.flush(favorite);expect(f.componentInstance.favoriteId()).toBe(10);TestBed.inject(AuthService).handleUnauthorized(false);expect(f.componentInstance.favoriteId()).toBeNull();
 });
 it('si falla la consulta de favoritos no simula éxito y permite reintentar',async()=>{
  await signIn();const f=TestBed.createComponent(PublicProductDetailComponent);fixtures.push(f);f.detectChanges();http.expectOne(base+'/api/public/products/313').flush(productDto());http.expectOne(base+'/api/wishlist').flush({}, {status:500,statusText:'Error'});expect(f.componentInstance.favoriteId()).toBeNull();expect(f.componentInstance.favoriteNotice()).toContain('No pudimos');f.componentInstance.addFavorite(313);http.expectOne(base+'/api/wishlist').flush({items:[],totalItems:0});http.expectOne(base+'/api/wishlist').flush(favorite);expect(f.componentInstance.favoriteId()).toBe(10);
 });
 it('una consulta recuperada no elimina un favorito que el usuario intentaba guardar',async()=>{
  await signIn();const f=TestBed.createComponent(PublicProductDetailComponent);fixtures.push(f);f.detectChanges();http.expectOne(base+'/api/public/products/313').flush(productDto());http.expectOne(base+'/api/wishlist').flush({}, {status:503,statusText:'Unavailable'});f.componentInstance.addFavorite(313);http.expectOne(base+'/api/wishlist').flush({items:[favorite],totalItems:1});http.expectNone(base+'/api/wishlist/10');expect(f.componentInstance.favoriteId()).toBe(10);expect(f.componentInstance.favoriteNotice()).toContain('ya está');
 });
 it('galería usa imágenes reales, descripción y atributos sin HTML ejecutable',()=>{
  const f=detail([],{images:[{url:'https://res.cloudinary.com/test/second.jpg',displayOrder:1}]});const instance=f.componentInstance;expect(instance.imageNumber()).toBe(1);const thumb=f.nativeElement.querySelectorAll('.gallery-thumb')[1] as HTMLButtonElement;thumb.click();f.detectChanges();expect(instance.imageNumber()).toBe(2);expect(thumb.getAttribute('aria-current')).toBe('true');instance.selectedImage.set('https://not-a-product.test');expect(instance.imageNumber()).toBe(1);instance.descriptionExpanded.update(instance.invert);expect(instance.descriptionExpanded()).toBe(true);expect(instance.maximum()).toBeGreaterThan(0);
 });
 it('home prioriza disponibles en la selección recibida sin reordenar una página de catálogo',()=>{
  const f=TestBed.createComponent(PublicHomeComponent);fixtures.push(f);f.detectChanges();http.expectOne(r=>r.url.endsWith('/categories/active')).flush([categoryDto]);http.expectOne(r=>r.url.endsWith('/latest')).flush([productDto({id:1,stock:0,name:'Agotado no promocionado'}),productDto({id:2,stock:5,name:'Instrumento disponible'})]);http.expectOne(r=>r.url.endsWith('/featured')).flush(productPage([productDto({stock:0})],{size:6}));f.detectChanges();expect(f.nativeElement.textContent).toContain('Instrumento disponible');expect(f.nativeElement.textContent).not.toContain('Agotado no promocionado');expect(f.nativeElement.textContent).toContain('Sin destacados disponibles');
 });
 it('panel de filtros descarta borradores al reabrir, aplica una navegación y conserva relevancia',async()=>{
  const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);const f=TestBed.createComponent(PublicCatalogComponent);fixtures.push(f);f.detectChanges();http.expectOne(r=>r.url.endsWith('/categories/active')).flush([categoryDto]);await new Promise(r=>setTimeout(r,250));http.expectOne(r=>r.url.endsWith('/catalog')).flush(productPage());const view=f.componentInstance;view.openFilters();view.draftCategory.set('20');view.filtersOpen.set(false);view.openFilters();expect(view.draftCategory()).toBe('');view.draftCategory.set('20');view.draftSort.set('price_asc');view.applyFilters();expect(navigate).toHaveBeenLastCalledWith(['/main/catalog'],expect.objectContaining({queryParams:{categoryId:'20',categoria:null,sortBy:'price_asc',page:null}}));view.keyword.set('jarana');view.draftSort.set('price_desc');view.applyFilters();expect(navigate).toHaveBeenLastCalledWith(['/main/catalog'],expect.objectContaining({queryParams:expect.objectContaining({sortBy:'featured'})}));view.resetDraft();expect(view.draftCategory()).toBe('');expect(view.sortLabel()).toBe('Destacados');view.categoryId.set('20');expect(view.categoryName()).toBe(categoryDto.name);view.categoryId.set('999');expect(view.categoryName()).toContain('seleccionada');
 });

 it('opiniones se consultan bajo demanda, tienen paginado HTTP y no envían JWT en GET público',()=>{
  const f=reviews();http.expectNone(r=>r.url.includes('/api/reviews'));f.componentInstance.load();f.componentInstance.load();const req=http.expectOne(r=>r.url.endsWith('/reviews/product/313'));expect(req.request.params.get('page')).toBe('0');expect(req.request.params.get('size')).toBe('10');expect(req.request.params.get('sortBy')).toBe('RECENT');expect(req.request.headers.has('Authorization')).toBe(false);req.flush(reviewPage([review]));f.detectChanges();expect(f.nativeElement.textContent).toContain(review.comment);f.componentInstance.load(1);http.expectOne(r=>r.params.get('page')==='1').flush({reviews:[],totalReviews:11,currentPage:1,totalPages:2});f.detectChanges();expect(f.nativeElement.textContent).toContain('Aún no hay opiniones');
 });
 it('errores de red y JSON inválido de opiniones permiten reintento sin inventar comentarios',()=>{
  const f=reviews();f.componentInstance.load();http.expectOne(r=>r.url.includes('/api/reviews')).flush({}, {status:404,statusText:'Not found'});expect(f.componentInstance.busy()).toBe(false);f.componentInstance.load();http.expectOne(r=>r.url.includes('/api/reviews')).flush({invalid:true});expect(f.componentInstance.page()).toBeNull();expect(f.componentInstance.error()).toContain('No pudimos');f.componentInstance.load();http.expectOne(r=>r.url.includes('/api/reviews')).flush(reviewPage());expect(f.componentInstance.error()).toBe('');
 });
 it('autoriza publicación únicamente tras elegibilidad del servidor y no duplica POST',async()=>{
  await signIn();const f=reviews();const view=f.componentInstance;view.comment=review.comment;view.submit();http.expectNone(base+'/api/reviews');view.checkEligibility();view.checkEligibility();const eligible=http.expectOne(base+'/api/reviews/product/313/eligibility');expect(eligible.request.headers.has('Authorization')).toBe(true);eligible.flush({canReview:true,hasPurchased:true,alreadyReviewed:false});view.title='Prueba controlada';view.submit();view.submit();const post=http.expectOne(base+'/api/reviews');expect(post.request.body).toEqual({productId:313,rating:5,title:'Prueba controlada',comment:review.comment});post.flush(review);expect(view.notice()).toContain('revisión');expect(view.comment).toBe('');expect(view.page()).toBeNull();
 });
 it('sin sesión no consulta elegibilidad; compra faltante y duplicados no habilitan envío',async()=>{
  const f=reviews();f.componentInstance.checkEligibility();http.expectNone(r=>r.url.includes('/eligibility'));await signIn();f.componentInstance.checkEligibility();http.expectOne(r=>r.url.includes('/eligibility')).flush({canReview:false,hasPurchased:false,alreadyReviewed:false});f.detectChanges();expect(f.nativeElement.textContent).toContain('compra válida');f.componentInstance.checkEligibility();http.expectOne(r=>r.url.includes('/eligibility')).flush({canReview:false,hasPurchased:true,alreadyReviewed:true});f.detectChanges();expect(f.nativeElement.textContent).toContain('Ya compartiste');http.expectNone(base+'/api/reviews');
 });
 it('errores de autorización y logout descartan borradores sensibles de reseña',async()=>{
  await signIn();const f=reviews();const view=f.componentInstance;view.checkEligibility();http.expectOne(r=>r.url.includes('/eligibility')).flush({}, {status:403,statusText:'Forbidden'});expect(view.error()).toContain('permiso');view.checkEligibility();http.expectOne(r=>r.url.includes('/eligibility')).flush({canReview:true,hasPurchased:true,alreadyReviewed:false});view.comment=review.comment;view.submit();http.expectOne(base+'/api/reviews').flush({}, {status:403,statusText:'Forbidden'});expect(view.error()).toContain('servidor');TestBed.inject(AuthService).handleUnauthorized(false);expect(view.comment).toBe('');expect(view.editing()).toBe(false);
 });
 it('cambio rápido de producto cancela reseñas fuera de orden y renderiza texto como datos',()=>{
  const f=reviews();f.componentInstance.load();const pending=http.expectOne(r=>r.url.includes('/api/reviews'));f.componentRef.setInput('productId',314);f.detectChanges();expect(pending.cancelled).toBe(true);f.componentInstance.load();http.expectOne(r=>r.url.endsWith('/314')).flush(reviewPage([{...review,comment:'<script>alert(1)</script>'}]));f.detectChanges();expect(f.nativeElement.querySelector('script')).toBeNull();expect(f.nativeElement.textContent).toContain('<script>');
 });
 it('mapper conserva calificación, modelo y descripción completa reales',()=>{const mapped=mapPublicProduct(parseProduct(productDto({detailedDescription:'Detalle completo',model:'M1',weight:2,dimensions:'10x20',averageRating:4.5,reviewCount:2})),base);expect(mapped).toMatchObject({description:'Detalle completo',model:'M1',weight:2,dimensions:'10x20',averageRating:4.5,reviewCount:2});});
 it('repositorio rechaza IDs, borradores y elegibilidad malformada antes de confiar en ellos',()=>{const repo=TestBed.inject(HttpReviewRepository);expect(()=>repo.list(0,0)).toThrow();expect(()=>repo.list(313,-1)).toThrow();expect(()=>repo.eligibility(-1)).toThrow();for(const draft of [{productId:313,rating:6,title:'',comment:review.comment},{productId:313,rating:0,title:'',comment:review.comment},{productId:313,rating:5,title:'a'.repeat(121),comment:review.comment},{productId:313,rating:5,title:'',comment:'short'},{productId:313,rating:5,title:'',comment:'a'.repeat(1001)}])expect(()=>repo.create(draft)).toThrow();});
 it.each([{canReview:'true',hasPurchased:true,alreadyReviewed:false},{canReview:true,hasPurchased:false,alreadyReviewed:false},{canReview:true,hasPurchased:true,alreadyReviewed:true}])('no confía en una elegibilidad incoherente %#',async value=>{await signIn();const f=reviews();f.componentInstance.checkEligibility();http.expectOne(r=>r.url.endsWith('/eligibility')).flush(value);expect(f.componentInstance.eligibility()).toBeNull();expect(f.componentInstance.editing()).toBe(false);});
});

describe('Validación defensiva de reseñas',()=>{
 it.each([null,[],{}, {...review,rating:0},{...review,rating:6},{...review,rating:1.5},{...review,reviewId:-1},{...review,verifiedPurchase:'yes'},{...review,createdAt:'invalid'},{...review,userName:4},{...review,title:4},{...review,comment:null}])('rechaza reseña inválida %#',value=>expect(()=>parseReview(value)).toThrow());
 it.each([null,{}, {reviews:'invalid'}, {...reviewPage(),totalReviews:-1},{...reviewPage(),currentPage:2,totalPages:1},{...reviewPage(),reviews:[review]},{...reviewPage(),reviews:Array(11).fill(review),totalReviews:11,totalPages:2}])('rechaza página inválida %#',value=>expect(()=>parseReviewPage(value)).toThrow());
 it('acepta título nulo sin inventar un título comercial',()=>expect(parseReview({...review,title:null}).title).toBe(''));
});
