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
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';
@Component({selector:'app-connected-favorites',standalone:true,host:{class:'ion-page'},
 imports:[CurrencyPipe,RouterLink,IonHeader,IonToolbar,IonTitle,IonButtons,IonBackButton,IonContent,PublicImageComponent,CmcLoadingComponent],
 styles:['article {display:grid;grid-template-columns:80px minmax(0,1fr);gap:16px;padding:16px;border:1px solid var(--cmc-border);border-radius:12px;margin-block:12px;} cmc-public-image {height:96px;} button,a {min-height:48px;display:inline-flex;align-items:center;} button {padding:8px;border:1px solid var(--cmc-border);background:var(--cmc-surface);border-radius:8px;color:var(--cmc-primary);}'],
 template:`<ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/main/home" /></ion-buttons><ion-title>Favoritos</ion-title></ion-toolbar></ion-header>
 <ion-content class="cmc-page"><main class="cmc-page-container cmc-account"><h2>Tus instrumentos favoritos</h2>
 @if(loading()){<cmc-loading message="Consultando favoritos" />}
 @if(error()){<p role="alert">{{error()}}</p><button [disabled]="loading()" (click)="reload()">Reintentar</button>}
 @if(!loading() && !error() && !items().length){<p>No tienes favoritos guardados.</p><a routerLink="/main/catalog">Explorar catálogo</a>}
 @for(item of items();track item.wishlistId){<article><cmc-public-image [src]="item.productImage" [alt]="item.productName"/><div><h3>{{item.productName}}</h3><p>{{item.currentPrice | currency:'MXN'}}</p><p>{{item.available===false || item.availableStock===0?'No disponible':item.availableStock===null || item.available!==true?'Disponibilidad por confirmar':'Disponible'}}</p><a [routerLink]="['/products',item.productId]">Ver producto</a><button [disabled]="loading()" (click)="remove(item.wishlistId)" [attr.aria-label]="'Quitar de favoritos '+item.productName">Quitar</button></div></article>}
 </main></ion-content>`,})
export class ConnectedFavoritesComponent {
 private readonly favorites=inject(ProductFavoritesService);
 private readonly repo=inject(WISHLIST_REPOSITORY);private readonly destroyRef=inject(DestroyRef);private readonly cancel=new Subject<void>();
 readonly items=signal<readonly WishlistItem[]>([]);readonly loading=signal(false);readonly error=signal('');
 constructor(){inject(AuthService).sessionEnded$.pipe(takeUntilDestroyed()).subscribe(()=>{this.cancel.next();this.items.set([]);this.loading.set(false);});this.reload();}
 reload():void {if(this.loading())return;this.loading.set(true);this.error.set('');this.repo.list().pipe(takeUntil(this.cancel),takeUntilDestroyed(this.destroyRef)).subscribe({next:data=>{this.items.set(data.items);this.loading.set(false);},error:e=>{this.loading.set(false);this.error.set(describeApiError(e));}});}
 remove(id:number):void {if(this.loading())return;this.loading.set(true);this.error.set('');this.repo.remove(id).pipe(takeUntil(this.cancel),takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>{this.favorites.forget(id);this.loading.set(false);this.reload();},error:e=>{this.loading.set(false);this.error.set(describeApiError(e));}});}
}
