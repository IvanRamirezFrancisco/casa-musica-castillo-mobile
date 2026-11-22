import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonBackButton, IonBadge, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonToolbar, type ScrollCustomEvent } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, bagHandleOutline, cartOutline, removeOutline, trashOutline } from 'ionicons/icons';
import { CART_LIMITS, type CartItem } from '../../core/models/cart.model';
import { CartService } from '../../core/services/cart.service';
import { PublicImageComponent } from '../public-catalog/public-product-grid.component';
import { ActionDialogComponent } from '../../shared/ui/action-dialog/action-dialog.component';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';

@Component({
  selector: 'app-connected-cart',
  standalone: true,
  imports: [
    RouterLink, CurrencyPipe, IonBackButton, IonBadge, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonToolbar,
    PublicImageComponent, ActionDialogComponent, CmcButtonComponent, CmcIconComponent, CmcErrorStateComponent, CmcLoadingComponent,
  ],
  host: { class: 'ion-page' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './connected-cart.view.scss',
  template: `
    <ion-header class="ion-no-border cart-header">
      <ion-toolbar>
        @if (emptyConfirmed()) { <ion-buttons slot="start"><ion-back-button defaultHref="/main/catalog" text="" aria-label="Volver al catálogo" /></ion-buttons> }
        <div class="cart-brand">
          <h1>Casa de Música Castillo</h1>
          <p>{{ emptyConfirmed() ? 'Tu carrito está vacío' : 'Continúa con tu compra' }}</p>
        </div>
        <ion-buttons slot="end" class="cart-header-actions">
          <ion-badge class="cart-count">{{ cart.itemCount() }} {{ cart.itemCount() === 1 ? 'unidad' : 'unidades' }}</ion-badge>
          <a class="header-account compact-account-action" routerLink="/main/profile" aria-label="Abrir Perfil y Pedidos">
            <cmc-icon name="person" />
          </a>
          <button type="button" class="header-trash" aria-label="Vaciar carrito" [hidden]="emptyConfirmed()" [disabled]="!summaryCart() || cart.mutating() || cart.clearUncertain()" (click)="openClear($event)">
            <ion-icon name="trash-outline" aria-hidden="true"></ion-icon>
          </button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="cmc-page cmc-root-page" [scrollEvents]="!!summaryCart()" (ionScroll)="onCartScroll($event)">
      <main #cartList class="cmc-page-container cmc-account connected-cart" aria-label="Carrito" tabindex="-1">
        @if (!auth.hasValidSession()) {
          <p role="status">Inicia sesión para consultar tu carrito.</p>
          <a class="cmc-link" routerLink="/login" [queryParams]="{returnUrl: '/main/cart'}">Iniciar sesión</a>
        } @else if (cart.loading()) {
          <cmc-loading message="Consultando tu carrito" />
        } @else if (cart.error(); as err) {
          <cmc-error-state heading="No pudimos cargar tu carrito" [description]="err" (retry)="cart.load()" />
        } @else if (emptyConfirmed()) {
          <section class="commerce-empty cart-empty" aria-labelledby="cart-empty-heading">
            <span class="empty-mark" aria-hidden="true"><ion-icon name="bag-handle-outline"/></span>
            <h2 id="cart-empty-heading">Tu carrito está vacío</h2>
            <p>Los instrumentos que agregues aparecerán aquí. Mientras decides, puedes guardarlos en favoritos y compararlos con calma.</p>
            <cmc-button fullWidth (click)="goToCatalog()"><cmc-icon name="arrow"/> Explorar catálogo</cmc-button>
            <a class="empty-favorites" routerLink="/favorites"><cmc-icon name="heart"/> Ver favoritos</a>
          </section>
        } @else if (!cart.cart()) {
          <p role="status">Consultando el estado del carrito…</p>
        } @else if (cart.cart(); as data) {
          @if (data.warningMessage) { <p class="warn" role="status">{{ data.warningMessage }}</p> }
          @if (!clearOpen() && cart.notice(); as notice) { <p class="err" role="alert">{{ notice }}</p> }
          @if (cart.validation(); as check) {
            @for (msg of check.globalErrors; track msg) { <p class="err" role="alert">{{ msg }}</p> }
            @for (w of check.itemWarnings; track w.itemId) { <p class="warn" role="status">{{ w.warningMessage }}</p> }
          }

          <div class="items">
            @for (item of data.items; track item.itemId) {
              <article class="card">
                <div class="thumb"><cmc-public-image [src]="item.productImage" [alt]="item.productName" [compact]="true" /></div>
                <div class="item-body">
                  @if (item.productSku) { <span class="item-sku">{{ item.productSku }}</span> }
                  <a class="cmc-link cmc-font-bold item-title" [routerLink]="['/products', item.productId]">{{ item.productName }}</a>
                  <p class="cmc-caption item-money">
                    <span>{{ item.unitPrice | currency:'MXN' }} c/u</span>
                  </p>
                  @if (item.warningMessage || !item.available) {
                    <p class="warn" role="status">{{ item.warningMessage || 'No disponible actualmente.' }}</p>
                  }
                </div>
                <button type="button" class="icon-btn remove-item" [disabled]="cart.mutating() || cart.clearUncertain()" [attr.aria-label]="'Eliminar ' + item.productName" (click)="cart.removeItem(item.itemId)">
                      <ion-icon name="trash-outline" aria-hidden="true"></ion-icon>
                    </button>
                <div class="item-actions">
                  <div class="qty" role="group" [attr.aria-label]="'Cantidad de ' + item.productName">
                    <button type="button" class="icon-btn" [disabled]="cart.mutating() || cart.clearUncertain() || item.quantity <= limits.minQuantity" [attr.aria-label]="'Reducir cantidad de ' + item.productName" (click)="changeQty(item, -1)">
                      <ion-icon name="remove-outline" aria-hidden="true"></ion-icon>
                    </button>
                    <span aria-live="polite">{{ item.quantity }}</span>
                    <button type="button" class="icon-btn" [disabled]="cart.mutating() || cart.clearUncertain() || !canIncrement(item)" [attr.aria-label]="'Aumentar cantidad de ' + item.productName" (click)="changeQty(item, 1)">
                      <ion-icon name="add-outline" aria-hidden="true"></ion-icon>
                    </button>
                  </div>
                    <div class="item-subtotal"><span>Subtotal</span><strong>{{ item.subtotal | currency:'MXN' }}</strong></div>
                </div>
              </article>
            }
          </div>

          <cmc-button class="clear-cart" variant="ghost" fullWidth [disabled]="cart.mutating() || cart.clearUncertain()" (click)="openClear($event)">
            Vaciar carrito
          </cmc-button>
        }
      </main>
    </ion-content>
    @if (summaryCart(); as data) {
      <ion-footer class="ion-no-border cart-footer">
        <section class="cart-total" [class.compact]="compactSummary()" aria-labelledby="cart-total-heading">
          <div class="summary-header">
            <div class="summary-price">
              <h2 id="cart-total-heading">Total del carrito</h2>
              <div role="status">
                @if (cart.mutating()) {
                  <span class="summary-message">Actualizando importes…</span>
                } @else if (data.amountsVerified === false) {
                  <span class="summary-message">Importes por confirmar</span>
                } @else {
                  <strong>{{ data.total | currency:'MXN' }}</strong>
                }
              </div>
            </div>
            @if (data.amountsVerified === false || cart.clearUncertain()) {
              <cmc-button variant="secondary" size="compact" fullWidth [disabled]="cart.mutating() || cart.clearUncertain()" (click)="cart.load()">Actualizar importes</cmc-button>
            } @else {
              <cmc-button variant="secondary" size="compact" fullWidth [disabled]="!data.canCheckout || cart.clearUncertain()" [loading]="cart.mutating()" loadingLabel="Validando" (click)="proceed()">
                Continuar compra
              </cmc-button>
            }
          </div>
          @if (data.amountsVerified === false && !cart.mutating()) {
            <p class="summary-note">Actualiza el carrito para confirmar el total.</p>
          }
          @if (data.amountsVerified !== false && !cart.mutating() && !cart.clearUncertain()) {
            <div #breakdown id="cart-breakdown" class="cart-breakdown" [hidden]="compactSummary()">
              <dl>
                <div class="row"><dt>Subtotal</dt><dd>{{ data.subtotal | currency:'MXN' }}</dd></div>
                @if (data.discount > 0) {
                  <div class="row"><dt>Descuento</dt><dd>-{{ data.discount | currency:'MXN' }}</dd></div>
                }
                <div class="row"><dt>Impuestos</dt><dd>{{ data.tax | currency:'MXN' }}</dd></div>
              </dl>
              <p>El envío se cotiza en el siguiente paso.</p>
            </div>
          }
        </section>
      </ion-footer>
    }
    @if (clearedNotice()) {
      <ion-footer class="ion-no-border cart-feedback-footer"><p class="cart-cleared-notice" role="status"><cmc-icon name="check"/> Carrito vaciado</p></ion-footer>
    }
    <cmc-action-dialog [open]="clearOpen()" [busy]="clearing()" title="¿Vaciar el carrito?"
      [content]="clearConfirmation" (closed)="onClearClosed()"/>
    <ng-template #clearConfirmation>
      <div class="clear-dialog">
        @if (clearSnapshot; as data) {
          <p class="clear-description">{{ data.items.length }} {{ data.items.length === 1 ? 'artículo' : 'artículos' }} ·
            {{ data.totalItems }} {{ data.totalItems === 1 ? 'unidad' : 'unidades' }} ·
            @if (cart.mutating() || cart.clearUncertain() || data.amountsVerified === false) { Importes por confirmar }
            @else { {{ data.total | currency:'MXN' }} }
          </p>
        }
        <p class="clear-warning"><ion-icon name="trash-outline" aria-hidden="true"></ion-icon><span>Se eliminarán todos los productos del carrito. Esta acción no se puede deshacer.</span></p>
        <p>Tus favoritos y tu cuenta no cambiarán. Puedes volver a agregar los instrumentos desde el catálogo.</p>
        @if (clearError(); as error) { <p class="err" role="alert">{{ error }}</p> }
        <div class="clear-dialog-actions">
          @if (cart.clearUncertain()) {
            <cmc-button fullWidth [loading]="clearing()" loadingLabel="Comprobando carrito" (click)="checkClear()">Comprobar carrito</cmc-button>
          } @else {
            <button type="button" class="clear-destructive" [disabled]="clearing()" [attr.aria-busy]="clearing()" (click)="confirmClear()"><ion-icon name="trash-outline" aria-hidden="true"/> {{ clearing() ? 'Vaciando carrito…' : 'Vaciar carrito' }}</button>
          }
          <cmc-button variant="secondary" fullWidth [disabled]="clearing()" (click)="clearDialog()?.close()">Cancelar</cmc-button>
        </div>
      </div>
    </ng-template>
  `,
})
export class ConnectedCartComponent {
  private entered = false;
  private activeView = true;
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  readonly clearedNotice = signal(false);
  readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private clearTrigger: HTMLElement | null = null;
  protected clearSnapshot: ReturnType<CartService['cart']> = null;
  private scrollLimit = 0;
  private breakdownHeight = 0;
  readonly clearOpen = signal(false);
  readonly clearing = signal(false);
  readonly clearError = signal('');
  readonly clearDialog = viewChild(ActionDialogComponent);
  private readonly content = viewChild(IonContent);
  private readonly cartList = viewChild<ElementRef<HTMLElement>>('cartList');
  private readonly breakdown = viewChild<ElementRef<HTMLElement>>('breakdown');
  private readonly injector = inject(Injector);
  readonly compactSummary = signal(true);

  ionViewWillEnter(): void {
    this.activeView = true;
    if (this.entered) this.cart.load();
    this.entered = true;
  }

  readonly cart = inject(CartService);
  readonly limits = CART_LIMITS;
  readonly emptyConfirmed = computed(() => this.auth.hasValidSession() && !this.cart.loading() && !this.cart.error()
    && !this.cart.mutating() && !this.cart.clearUncertain() && this.cart.cart()?.items.length === 0);
  readonly summaryCart = computed(() => {
    const data = this.cart.cart();
    return this.auth.hasValidSession() && !this.cart.loading() && !this.cart.error() && data?.items.length ? data : null;
  });
  private readonly router = inject(Router);

  constructor() {
    addIcons({ trashOutline, addOutline, removeOutline, cartOutline, bagHandleOutline });
    this.destroyRef.onDestroy(() => this.hideClearedNotice());
    this.auth.sessionEnded$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hideClearedNotice();
      this.clearing.set(false);
      this.clearOpen.set(false);
      this.clearSnapshot = null;
      this.clearError.set('');
      afterNextRender(() => { void this.clearDialog()?.close(); }, { injector: this.injector });
    });
    effect(onCleanup => {
      const content = this.content();
      const list = this.cartList()?.nativeElement;
      const breakdown = this.breakdown()?.nativeElement;
      if (!content || !list || !breakdown || typeof ResizeObserver === 'undefined') return;
      let observer: ResizeObserver | undefined;
      let active = true;
      onCleanup(() => { active = false; observer?.disconnect(); });
      void content.getScrollElement().then(scroll => {
        if (!active) return;
        observer = new ResizeObserver(() => {
          this.scrollLimit = scroll.scrollHeight - scroll.clientHeight;
          this.breakdownHeight = breakdown.offsetHeight;
          this.updateSummaryPosition(scroll.scrollTop);
        });
        observer.observe(scroll);
        observer.observe(list);
        observer.observe(breakdown);
      });
    });
    this.cart.load();
  }

  onCartScroll(event: ScrollCustomEvent): void {
    this.updateSummaryPosition(event.detail.scrollTop);
  }

  private updateSummaryPosition(top: number): void {
    // Expansion reserves space below ion-content. Discount that reservation so it cannot
    // immediately trigger compact mode again while the user remains near the end.
    const remaining = this.scrollLimit - top - this.breakdownHeight;
    const next = this.compactSummary() ? remaining > 12 : remaining > 48;
    if (next !== this.compactSummary()) this.compactSummary.set(next);
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

  openClear(event: Event): void {
    const current = this.summaryCart();
    if (!current || this.clearOpen() || this.cart.mutating() || this.cart.clearUncertain()) return;
    const opener = event.target instanceof HTMLElement ? event.target.closest('button') : null;
    this.clearTrigger = opener ?? (event.currentTarget instanceof HTMLElement ? event.currentTarget : null);
    this.clearSnapshot = current;
    this.clearError.set('');
    this.clearOpen.set(true);
  }

  async confirmClear(): Promise<void> {
    if (!this.clearOpen() || this.clearing() || this.cart.mutating()) return;
    if (this.cart.cart() !== this.clearSnapshot) {
      this.clearError.set('El carrito cambió. Cierra esta ventana y vuelve a confirmar.');
      return;
    }
    this.clearError.set('');
    this.clearing.set(true);
    const session = this.auth.sessionVersion;
    const cleared = await this.cart.clear();
    this.finishClear(cleared, session);
  }

  async checkClear(): Promise<void> {
    if (this.clearing() || !this.clearOpen() || !this.cart.clearUncertain()) return;
    const session = this.auth.sessionVersion;
    this.clearing.set(true);
    const cleared = await this.cart.reconcileClear();
    this.finishClear(cleared, session);
  }

  private finishClear(cleared: boolean, session: number): void {
    this.clearing.set(false);
    if (session !== this.auth.sessionVersion || !this.auth.hasValidSession()) return;
    if (cleared) {
      if (this.activeView) {
        this.hideClearedNotice();
        this.clearedNotice.set(true);
        this.notifications.success('Carrito vaciado', 'Se eliminaron todos los productos del carrito.');
        this.noticeTimer = setTimeout(() => this.hideClearedNotice(), 8000);
      }
      afterNextRender(() => { void this.clearDialog()?.close(); }, { injector: this.injector });
    } else {
      this.clearError.set(this.cart.notice() ?? 'No se pudo vaciar el carrito. Inténtalo de nuevo.');
    }
  }

  ionViewWillLeave(): void {
    this.activeView = false;
    this.hideClearedNotice();
    this.clearOpen.set(false);
    this.clearSnapshot = null;
    this.clearTrigger = null;
    this.clearing.set(false);
    afterNextRender(() => { void this.clearDialog()?.close(); }, { injector: this.injector });
  }

  private hideClearedNotice(): void {
    clearTimeout(this.noticeTimer);
    this.noticeTimer = undefined;
    this.clearedNotice.set(false);
  }

  onClearClosed(): void {
    this.clearOpen.set(false);
    this.clearSnapshot = null;
    const opener = this.clearTrigger;
    this.clearTrigger = null;
    afterNextRender(() => {
      if (this.clearOpen() || !this.activeView) return;
      const target = opener?.isConnected && !opener.matches(':disabled') ? opener : this.cartList()?.nativeElement;
      target?.focus({ preventScroll: true });
    }, { injector: this.injector });
  }

  proceed(): void {
    if (!this.cart.cart()?.canCheckout) return;
    this.cart.validate().subscribe({
      next: (result) => {
        if (result.valid && result.canCheckout) void this.router.navigate(['/checkout']);
      },
      error: () => undefined,
    });
  }
}
