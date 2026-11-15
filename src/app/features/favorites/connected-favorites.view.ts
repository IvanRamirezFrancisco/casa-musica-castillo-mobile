import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonHeader,IonToolbar,IonTitle,IonButtons,IonBackButton,IonContent } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { WISHLIST_REPOSITORY } from '../../core/repositories/wishlist.repository';
import { WishlistItem } from '../../core/models/wishlist.model';
import { ProductFavoritesService } from '../../core/services/product-favorites.service';
import { AuthService } from '../../core/services/auth.service';
import { describeApiError } from '../../core/api/api-error-message';
import { PublicImageComponent } from '../public-catalog/public-product-grid.component';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';
@Component({selector:'app-connected-favorites',standalone:true,host:{class:'ion-page'},
 imports:[CurrencyPipe,RouterLink,IonHeader,IonToolbar,IonTitle,IonButtons,IonBackButton,IonContent,PublicImageComponent,CmcLoadingComponent,CmcIconComponent],
 styleUrl:'./connected-favorites.view.scss',
 template:`<ion-header class="ion-no-border cmc-header-transparent"><ion-toolbar>
 <ion-buttons slot="start"><ion-back-button defaultHref="/main/profile" text="" aria-label="Volver al perfil" /></ion-buttons><ion-title>Favoritos</ion-title>
 </ion-toolbar></ion-header>
 <ion-content class="cmc-page"><main class="cmc-page-container cmc-account favorites-page">
 <h1>Tus instrumentos favoritos</h1>
 <p class="favorite-notice" role="status">{{notice()}}</p>
 @if(loading()){<cmc-loading [message]="removing() ? 'Quitando favorito' : 'Consultando favoritos'" />}
 @if(error()){<p role="alert">{{error()}}</p><button class="favorite-action" type="button" [disabled]="loading()" (click)="reload()">Reintentar</button>}
 @if(!loading() && !error() && !items().length){<p>No tienes favoritos guardados.</p><a class="cmc-link" routerLink="/main/catalog">Explorar catálogo</a>}
 <div class="favorites-grid">
 @for(item of items();track item.wishlistId){
   <article class="favorite-card">
     <div class="favorite-image"><cmc-public-image [src]="item.productImage" [alt]="item.productName" [compact]="true"/></div>
     <div class="favorite-info">
       <h2><a class="cmc-link" [routerLink]="['/products',item.productId]">{{item.productName}}</a></h2>
       <p class="favorite-price">{{item.currentPrice | currency:'MXN'}}</p>
       <p class="favorite-stock">{{item.available===false || item.availableStock===0?'No disponible':item.availableStock===null || item.available!==true?'Disponibilidad por confirmar':'Disponible'}}</p>
     </div>
     <button class="favorite-action" type="button" [disabled]="loading()" (click)="remove(item.wishlistId)"
       [attr.aria-label]="'Quitar de favoritos '+item.productName"><cmc-icon name="saved"/><span>Quitar</span></button>
   </article>
 }
 </div></main></ion-content>`,})
export class ConnectedFavoritesComponent {
 private entered = false;
 ionViewWillEnter():void { if (this.entered) this.reload(); this.entered = true; }
 private readonly favorites=inject(ProductFavoritesService);
 private readonly repo=inject(WISHLIST_REPOSITORY);private readonly destroyRef=inject(DestroyRef);private readonly cancel=new Subject<void>();
 readonly removing=signal(false);
 readonly notice=signal('');
 private noticeTimer: ReturnType<typeof setTimeout> | undefined;
 readonly items=signal<readonly WishlistItem[]>([]);readonly loading=signal(false);readonly error=signal('');
 constructor(){
   this.destroyRef.onDestroy(() => this.clearNotice());
   inject(AuthService).sessionEnded$.pipe(takeUntilDestroyed()).subscribe(() => {
     this.cancel.next();
     this.items.set([]);
     this.loading.set(false);
     this.removing.set(false);
     this.error.set('');
     this.clearNotice();
   });
   this.reload();
 }
 private clearNotice(): void {
   clearTimeout(this.noticeTimer);
   this.notice.set('');
 }
 reload():void {if(this.loading())return;this.loading.set(true);this.error.set('');this.repo.list().pipe(takeUntil(this.cancel),takeUntilDestroyed(this.destroyRef)).subscribe({next:data=>{this.items.set(data.items);this.loading.set(false);},error:e=>{this.loading.set(false);this.error.set(describeApiError(e));}});}
 remove(id:number):void {
   if (this.loading()) return;
   this.clearNotice();
   this.loading.set(true);
   this.removing.set(true);
   this.error.set('');
   this.repo.remove(id).pipe(takeUntil(this.cancel),takeUntilDestroyed(this.destroyRef)).subscribe({
     next: () => {
       this.favorites.forget(id);
       this.items.update(items => items.filter(item => item.wishlistId !== id));
       this.notice.set('Producto retirado de favoritos.');
       this.noticeTimer = setTimeout(() => this.clearNotice(), 3000);
       this.loading.set(false);
       this.removing.set(false);
       this.reload();
     },
     error: error => {
       this.loading.set(false);
       this.removing.set(false);
       this.error.set(describeApiError(error));
     },
   });
 }
}
