import { PUBLIC_CATALOG_ENABLED } from '../../../core/repositories/public-catalog.repository';
import { PublicProductDetailComponent } from '../../public-catalog/public-product-detail.view';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { DemoCatalogService } from '../../../core/services/demo-catalog.service';
import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { CmcEmptyStateComponent } from '../../../shared/ui/empty-state/cmc-empty-state.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [PublicProductDetailComponent, RouterLink, CmcButtonComponent, CurrencyPipe, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CmcEmptyStateComponent],
  styles: ['.product-actions { display: grid; gap: 16px; padding-block: 24px; } .product-actions a { display: flex; align-items: center; min-height: 48px; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (publicCatalogEnabled) { <app-public-product-detail /> } @else {
    <ion-header class="ion-no-border cmc-header-transparent">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/main/catalog" text="Volver" aria-label="Volver al catálogo" /></ion-buttons>
        <ion-title class="cmc-title" role="heading" aria-level="1">Detalle del producto</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="cmc-page">
      <main class="cmc-page-container">
        @if (product(); as product) {
          <p class="cmc-caption">Demostración · {{ product.categoria }} · {{ product.marca }}</p>
          <h2 class="cmc-section-title">{{ product.nombre }}</h2>
          <p class="cmc-body">{{ product.descripcion }}</p>
          <p class="cmc-title">{{ product.precio | currency:'MXN':'symbol':'1.0-0' }} MXN</p>
          <p class="cmc-text-secondary">Información y precio ilustrativos. La información real del producto estará disponible posteriormente.</p>
          <div class="product-actions">
            <cmc-button fullWidth (click)="addToCart()">Agregar al carrito DEMO</cmc-button>
            <p role="status" aria-live="polite">{{ message() }}</p>
            <a class="cmc-link" routerLink="/main/cart">Ver carrito</a>
          </div>
        } @else {
          <cmc-empty-state heading="Producto no encontrado" description="No encontramos este producto en el catálogo de demostración." />
        }
      </main>
    </ion-content>
  }`,
})
export class ProductDetailPage {
  readonly publicCatalogEnabled = inject(PUBLIC_CATALOG_ENABLED);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  private readonly catalog = inject(DemoCatalogService);
  private readonly checkout = inject(DemoCheckoutStateService);
  private readonly addedId = signal<number | null>(null);
  readonly message = computed(() => this.addedId() === this.product()?.id
    ? 'Producto agregado al carrito de demostración.' : '');
  readonly product = computed(() => this.catalog.findById(this.params()?.get('id') ?? ''));

  addToCart(): void {
    const product = this.product();
    if (!product) return;
    this.checkout.addProduct(product.id);
    this.addedId.set(product.id);
  }
}
