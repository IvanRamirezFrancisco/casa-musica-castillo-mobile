import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonBadge, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, cartOutline, removeOutline, trashOutline } from 'ionicons/icons';
import { CART_LIMITS, type CartItem } from '../../core/models/cart.model';
import { CartService } from '../../core/services/cart.service';
import { PublicImageComponent } from '../public-catalog/public-product-grid.component';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';

@Component({
  selector: 'app-connected-cart',
  standalone: true,
  imports: [
    RouterLink, CurrencyPipe, IonBadge, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar,
    PublicImageComponent, CmcButtonComponent, CmcEmptyStateComponent, CmcErrorStateComponent, CmcLoadingComponent,
  ],
  host: { class: 'ion-page' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    '.cart-count { --background:var(--cmc-promo-mamey); --color:var(--cmc-text-primary); margin-inline-end:var(--cmc-space-3); }',
    '.qty span { min-inline-size:2ch; text-align:center; font-weight:700; }',
    '.icon-btn:focus-visible { outline:3px solid var(--cmc-primary); outline-offset:2px; }',
    '.items { display:grid; gap:12px; margin-bottom:20px; }',
    '.card { display:grid; grid-template-columns:72px minmax(0,1fr); gap:12px; background:var(--cmc-surface); border:1px solid var(--cmc-border); border-radius:var(--cmc-radius-lg); padding:12px; box-shadow:var(--cmc-shadow-card); }',
    '.thumb { width:72px; height:72px; border-radius:8px; overflow:hidden; }',
    '.row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }',
    '.qty { display:inline-flex; align-items:center; gap:8px; }',
    '.icon-btn { min-width:44px; min-height:44px; border:1px solid var(--cmc-border); border-radius:8px; background:transparent; display:inline-flex; align-items:center; justify-content:center; }',
    '.summary { background:var(--cmc-surface-alt); border:1px solid var(--cmc-border); border-radius:12px; padding:16px; display:grid; gap:8px; margin-block:16px; }',
    '.actions { display:grid; gap:12px; }',
    '@media(min-width:52rem){.cart-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(16rem,.9fr);gap:24px;align-items:start}.summary{margin-top:0}}',
    '.warn { background:#fff6e0; color:#5c4300; padding:10px 12px; border-radius:8px; margin-block:8px; font-size:0.9rem; }',
    '.err { background:#fdecea; color:#7a1c14; padding:10px 12px; border-radius:8px; margin-block:8px; font-size:0.9rem; }',
  ],
  template: `
    <ion-header class="ion-no-border cmc-header-transparent">
      <ion-toolbar>
        <ion-title class="cmc-title" role="heading" aria-level="1">Carrito</ion-title>
        <ion-buttons slot="end"><ion-badge class="cart-count" [attr.aria-label]="cart.itemCount() + ' artículos'">{{ cart.itemCount() }}</ion-badge></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="cmc-page cmc-root-page" [scrollY]="true">
      <main class="cmc-page-container cmc-account">
        @if (cart.loading()) {
          <cmc-loading message="Consultando tu carrito" />
        } @else if (cart.error(); as err) {
          <cmc-error-state heading="No pudimos cargar tu carrito" [description]="err" (retry)="cart.load()" />
        } @else if (!cart.cart() || cart.cart()!.items.length === 0) {
          <cmc-empty-state icon="cart-outline" heading="Tu carrito está vacío" description="Agrega instrumentos desde el catálogo para continuar." />
          <cmc-button fullWidth (click)="goToCatalog()">Explorar catálogo</cmc-button>
        } @else if (cart.cart(); as data) {
          @if (data.warningMessage) { <p class="warn" role="status">{{ data.warningMessage }}</p> }
          @if (cart.notice(); as notice) { <p class="err" role="alert">{{ notice }}</p> }
          @if (cart.validation(); as check) {
            @for (msg of check.globalErrors; track msg) { <p class="err" role="alert">{{ msg }}</p> }
            @for (w of check.itemWarnings; track w.itemId) { <p class="warn" role="status">{{ w.warningMessage }}</p> }
          }

          <div class="cart-layout"><div class="items">
            @for (item of data.items; track item.itemId) {
              <article class="card">
                <div class="thumb"><cmc-public-image [src]="item.productImage" [alt]="item.productName" /></div>
                <div>
                  <div class="row">
                    <a class="cmc-link cmc-font-bold" [routerLink]="['/products', item.productId]">{{ item.productName }}</a>
                    <button type="button" class="icon-btn" [disabled]="cart.mutating()" [attr.aria-label]="'Eliminar ' + item.productName" (click)="cart.removeItem(item.itemId)">
                      <ion-icon name="trash-outline" aria-hidden="true"></ion-icon>
                    </button>
                  </div>
                  <p class="cmc-caption">{{ item.unitPrice | currency:'MXN' }} c/u · Subtotal {{ item.subtotal | currency:'MXN' }}</p>
                  @if (item.warningMessage || !item.available) {
                    <p class="warn" role="status">{{ item.warningMessage || 'No disponible actualmente.' }}</p>
                  }
                  <div class="qty">
                    <button type="button" class="icon-btn" [disabled]="cart.mutating() || item.quantity <= limits.minQuantity" [attr.aria-label]="'Reducir cantidad de ' + item.productName" (click)="changeQty(item, -1)">
                      <ion-icon name="remove-outline" aria-hidden="true"></ion-icon>
                    </button>
                    <span aria-live="polite">{{ item.quantity }}</span>
                    <button type="button" class="icon-btn" [disabled]="cart.mutating() || !canIncrement(item)" [attr.aria-label]="'Aumentar cantidad de ' + item.productName" (click)="changeQty(item, 1)">
                      <ion-icon name="add-outline" aria-hidden="true"></ion-icon>
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>

          <div><section class="summary" aria-label="Resumen del carrito">
            <div class="row"><span>Subtotal</span><strong>{{ data.subtotal | currency:'MXN' }}</strong></div>
            @if (data.discount > 0) {
              <div class="row"><span>Descuento</span><strong>-{{ data.discount | currency:'MXN' }}</strong></div>
            }
            <div class="row"><span>Impuestos</span><strong>{{ data.tax | currency:'MXN' }}</strong></div>
            <div class="row"><span class="cmc-title">Total en carrito</span><strong class="cmc-title">{{ data.total | currency:'MXN' }}</strong></div>
            <p class="cmc-caption">Importes calculados por el servidor. El envío se cotiza en el siguiente paso.</p>
          </section>

          <div class="actions">
            <cmc-button variant="commercial" fullWidth [disabled]="!data.canCheckout" [loading]="cart.mutating()" loadingLabel="Validando" (click)="proceed()">
              Continuar compra
            </cmc-button>
            <cmc-button variant="secondary" fullWidth [disabled]="cart.mutating()" (click)="cart.clear()">
              Vaciar carrito
            </cmc-button>
          </div></div></div>
        }
      </main>
    </ion-content>
  `,
})
export class ConnectedCartComponent {
  readonly cart = inject(CartService);
  readonly limits = CART_LIMITS;
  private readonly router = inject(Router);

  constructor() {
    addIcons({ trashOutline, addOutline, removeOutline, cartOutline });
    this.cart.load();
  }

  canIncrement(item: CartItem): boolean {
    const max = item.availableStock !== null ? Math.min(CART_LIMITS.maxQuantity, item.availableStock) : CART_LIMITS.maxQuantity;
    return item.quantity < max;
  }

  changeQty(item: CartItem, delta: number): void {
    this.cart.setItemQuantity(item.itemId, item.quantity + delta);
  }

  goToCatalog(): void {
    void this.router.navigate(['/main/catalog']);
  }

  proceed(): void {
    this.cart.validate().subscribe({
      next: (result) => {
        if (result.valid && result.canCheckout) void this.router.navigate(['/checkout']);
      },
      error: () => undefined,
    });
  }
}
