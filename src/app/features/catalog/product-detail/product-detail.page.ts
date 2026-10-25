import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { CATALOG_DEMO_PRODUCTS } from '../catalog-demo.data';
import { CmcEmptyStateComponent } from '../../../shared/ui/empty-state/cmc-empty-state.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CurrencyPipe, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CmcEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
        } @else {
          <cmc-empty-state heading="Producto no encontrado" description="No encontramos este producto en el catálogo de demostración." />
        }
      </main>
    </ion-content>
  `,
})
export class ProductDetailPage {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly product = computed(() => {
    const raw = this.params()?.get('id') ?? '';
    if (!/^[1-9][0-9]*$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) ? CATALOG_DEMO_PRODUCTS.find(product => product.id === id) ?? null : null;
  });
}
