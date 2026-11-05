import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, finalize, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { IonBackButton,IonButtons,IonContent,IonHeader,IonTitle,IonToolbar } from '@ionic/angular';
import { WISHLIST_REPOSITORY } from '../../core/repositories/wishlist.repository';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { PurchaseIntentService } from '../../core/services/purchase-intent.service';
import { PublicCatalogService } from '../../core/services/public-catalog.service';
import { CmcMoneyPipe } from '../../shared/ui/money/cmc-money.pipe';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { CmcQuantityComponent } from '../../shared/ui/quantity/cmc-quantity.component';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';
import { PublicImageComponent } from './public-product-grid.component';
import { ProductReviewsComponent } from './product-reviews.component';
@Component({selector:'app-public-product-detail',standalone:true,providers:[PublicCatalogService],host:{class:'ion-page'},changeDetection:ChangeDetectionStrategy.OnPush,
 imports:[RouterLink,CmcMoneyPipe,CmcIconComponent,CmcQuantityComponent,IonBackButton,IonButtons,IonContent,IonHeader,IonTitle,IonToolbar,PublicImageComponent,CmcButtonComponent,CmcLoadingComponent,CmcErrorStateComponent,CmcEmptyStateComponent,ProductReviewsComponent],
 templateUrl:'./public-product-detail.view.html',styleUrl:'./public-product-detail.view.scss'})
export class PublicProductDetailComponent {
 readonly weightFormat = new Intl.NumberFormat('es-MX', {
  style: 'unit', unit: 'kilogram', maximumSignificantDigits: 21,
 });
 readonly service=inject(PublicCatalogService);readonly connected=inject(BACKEND_SESSION_ENABLED);readonly cart=inject(CartService);
 private readonly wishlist=inject(WISHLIST_REPOSITORY);private readonly auth=inject(AuthService);private readonly router=inject(Router);private readonly intent=inject(PurchaseIntentService);private readonly destroyRef=inject(DestroyRef);private readonly cancelled=new Subject<void>();
 readonly quantity=signal(1);readonly preparing=signal(false);readonly added=signal(false);readonly selectedImage=signal<string|null>(null);readonly savingFavorite=signal(false);readonly favoriteNotice=signal('');readonly favoriteId=signal<number|null>(null);readonly actionNotice=signal('');readonly descriptionExpanded=signal(false);readonly invert=(value:boolean)=>!value;
 private favoriteLoaded=false;invalidId=false;
 readonly maximum=computed(()=>Math.max(1,Math.min(100,this.service.product().data?.stock??1)));
 imageNumber():number{const p=this.service.product().data;return p?Math.max(1,p.images.indexOf(this.selectedImage()??p.imageUrl??'')+1):1;}
 constructor(){
  this.auth.sessionEnded$.pipe(takeUntilDestroyed()).subscribe(()=>{this.cancelled.next();this.favoriteId.set(null);this.favoriteLoaded=false;this.added.set(false);this.favoriteNotice.set('');});
  inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe(params=>{
   this.cancelled.next();const raw=params.get('id')??'';const id=Number(raw);this.invalidId=!/^[1-9][0-9]*$/.test(raw)||!Number.isSafeInteger(id);
   this.quantity.set(this.auth.hasValidSession()?this.intent.take(id)??1:1);this.added.set(false);this.selectedImage.set(null);this.favoriteId.set(null);this.favoriteLoaded=false;this.actionNotice.set('');this.favoriteNotice.set('');this.descriptionExpanded.set(false);
   this.service.loadProduct(this.invalidId?0:id);
   if(!this.invalidId&&this.connected&&this.auth.hasValidSession())this.loadFavoriteState(id);
  });
 }
 private resolveFavorite(id:number){return this.wishlist.list().pipe(tap(list=>{this.favoriteId.set(list.items.find(item=>item.productId===id)?.wishlistId??null);this.favoriteLoaded=true;}));}
 private loadFavoriteState(id:number):void{this.savingFavorite.set(true);this.resolveFavorite(id).pipe(takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef),finalize(()=>this.savingFavorite.set(false))).subscribe({error:()=>{this.favoriteNotice.set('No pudimos consultar tus favoritos. Puedes reintentar al guardar.');}});}
 addFavorite(id:number):void{
  if(this.savingFavorite())return;
  if(!this.auth.hasValidSession()){void this.router.navigate(['/login'],{queryParams:{returnUrl:`/products/${id}`}});return;}
  this.savingFavorite.set(true);this.favoriteNotice.set('');
  const mutate=()=>this.favoriteId()!==null?this.wishlist.remove(this.favoriteId()!).pipe(tap(()=>{this.favoriteId.set(null);this.favoriteNotice.set('Producto retirado de favoritos.');}),map(()=>undefined)):this.wishlist.add(id).pipe(tap(item=>{this.favoriteId.set(item.wishlistId);this.favoriteNotice.set('Producto guardado en favoritos.');}),map(()=>undefined));
  const request=this.favoriteLoaded?mutate():this.resolveFavorite(id).pipe(switchMap(()=>{if(this.favoriteId()!==null){this.favoriteNotice.set('Este producto ya está en tus favoritos.');return of(undefined);}return mutate();}));
  request.pipe(takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef),finalize(()=>this.savingFavorite.set(false))).subscribe({error:()=>{this.favoriteNotice.set('No se pudo actualizar el favorito. Intenta de nuevo.');}});
 }
 addToCart(productId:number):void{
  if(this.preparing()||this.cart.mutating())return;
  const quantity=this.quantity();const product=this.service.product().data;
  if(!product||product.id!==productId||product.availability!=='available'||!Number.isSafeInteger(quantity)||quantity<1||quantity>this.maximum()){this.actionNotice.set('Selecciona una cantidad disponible.');return;}
  if(!this.auth.hasValidSession()){this.intent.remember(productId,quantity);void this.router.navigate(['/login'],{queryParams:{returnUrl:`/products/${productId}`}});return;}
  this.preparing.set(true);this.added.set(false);this.actionNotice.set('');
  this.service.refreshForPurchase(productId).pipe(switchMap(fresh=>{
   if(fresh.availability!=='available'||fresh.stock===null||fresh.stock<quantity){this.actionNotice.set('Las existencias cambiaron. Revisa la cantidad antes de continuar.');return EMPTY;}
   if(fresh.price!==product.price){this.actionNotice.set('El precio cambió. Revisa el importe actualizado y vuelve a agregar si estás de acuerdo.');return EMPTY;}
   return this.cart.addProduct(productId,quantity);
  }),takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef),finalize(()=>this.preparing.set(false))).subscribe({next:()=>{this.intent.take(productId);this.added.set(true);},error:()=>this.actionNotice.set('No pudimos agregar el producto. Revisa tu conexión y vuelve a intentarlo.')});
 }
}
