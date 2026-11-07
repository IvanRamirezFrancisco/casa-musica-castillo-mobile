import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, receiptOutline } from 'ionicons/icons';
import { describeApiError } from '../../core/api/api-error-message';
import type { PublicPage } from '../../core/api/public-catalog.dto';
import type { OrderStatusCode, PaymentStatusCode, RealOrder } from '../../core/models/order.model';
import { REAL_ORDER_REPOSITORY } from '../../core/repositories/real-order.repository';
import { AuthService } from '../../core/services/auth.service';
import { CmcBadgeComponent, type CmcBadgeVariant } from '../../shared/ui/badge/cmc-badge.component';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';

export const orderVariant = (status: OrderStatusCode): CmcBadgeVariant =>
  status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'error' : status === 'PENDING' ? 'warning' : 'neutral';
export const paymentVariant = (status: PaymentStatusCode): CmcBadgeVariant =>
  status === 'PAID' ? 'success' : status === 'FAILED' ? 'error' : status === 'PENDING' ? 'warning' : 'neutral';

@Component({
  selector: 'app-connected-orders',
  standalone: true,
  imports: [
    RouterLink, CurrencyPipe, DatePipe, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar,
    CmcBadgeComponent, CmcButtonComponent, CmcEmptyStateComponent, CmcErrorStateComponent, CmcLoadingComponent,
  ],
  host: { class: 'ion-page' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    '.list { list-style:none; padding:0; margin:0; display:grid; gap:12px; }',
    '.card { display:grid; gap:8px; background:var(--cmc-surface); border-radius:12px; padding:16px; text-decoration:none; color:inherit; box-shadow:var(--cmc-shadow-card); }',
    '.row { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }',
    '.badges { display:flex; gap:6px; flex-wrap:wrap; }',
    '.pager { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-block:16px 96px; }',
  ],
  template: `
    <ion-header class="ion-no-border cmc-header-transparent">
      <ion-toolbar><ion-title class="cmc-title" role="heading" aria-level="1">Mis pedidos</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="cmc-page cmc-root-page">
      <main class="cmc-page-container cmc-account">
        @switch (status()) {
          @case ('loading') { <cmc-loading message="Consultando tus pedidos" /> }
          @case ('error') { <cmc-error-state heading="No pudimos cargar tus pedidos" [description]="errorMessage()" (retry)="load(pageNumber())" /> }
          @case ('ready') {
            @if (!page() || page()!.content.length === 0) {
              <cmc-empty-state icon="receipt-outline" heading="Aún no tienes pedidos" description="Cuando realices una compra aparecerá aquí." />
            } @else if (page(); as current) {
              <ul class="list" aria-label="Lista de pedidos">
                @for (order of current.content; track order.id) {
                  <li>
                    <a class="card" [routerLink]="['/orders', order.id]" [attr.aria-label]="'Pedido ' + order.orderNumber">
                      <div class="row">
                        <strong>{{ order.orderNumber }}</strong>
                        <span class="cmc-caption">{{ order.orderDate | date:'dd/MM/yyyy' }}</span>
                      </div>
                      <div class="badges">
                        <cmc-badge [variant]="orderBadge(order.status)">Pedido: {{ order.statusLabel }}</cmc-badge>
                        <cmc-badge [variant]="paymentBadge(order.paymentStatus)">Pago: {{ order.paymentStatusLabel }}</cmc-badge>
                        <cmc-badge variant="neutral">Envío: {{ order.shippingStatusLabel }}</cmc-badge>
                      </div>
                      <div class="row">
                        <span class="cmc-caption">{{ order.totalItems }} {{ order.totalItems === 1 ? 'artículo' : 'artículos' }} · {{ order.deliveryLabel }}</span>
                        <strong>{{ order.total | currency:'MXN' }} <ion-icon name="chevron-forward-outline" aria-hidden="true"></ion-icon></strong>
                      </div>
                    </a>
                  </li>
                }
              </ul>
              @if (current.totalPages > 1) {
                <nav class="pager" aria-label="Paginación de pedidos">
                  <cmc-button variant="secondary" size="compact" [disabled]="current.first" (click)="load(current.number - 1)">Anterior</cmc-button>
                  <span class="cmc-caption">Página {{ current.number + 1 }} de {{ current.totalPages }}</span>
                  <cmc-button variant="secondary" size="compact" [disabled]="current.last" (click)="load(current.number + 1)">Siguiente</cmc-button>
                </nav>
              }
            }
          }
        }
      </main>
    </ion-content>
  `,
})
export class ConnectedOrdersComponent {
  private readonly repository = inject(REAL_ORDER_REPOSITORY);
  private seq = 0;

  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly page = signal<PublicPage<RealOrder> | null>(null);
  readonly pageNumber = signal(0);
  readonly errorMessage = signal('');
  readonly orderBadge = orderVariant;
  readonly paymentBadge = paymentVariant;

  constructor() {
    addIcons({ chevronForwardOutline, receiptOutline });
    inject(AuthService).sessionEnded$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.seq++;
      this.page.set(null);
      this.pageNumber.set(0);
    });
    this.load(0);
  }

  load(targetPage = 0): void {
    const seq = ++this.seq;
    this.pageNumber.set(Math.max(0, targetPage));
    this.status.set('loading');
    this.repository.list(this.pageNumber(), 10).subscribe({
      next: (result) => {
        if (seq !== this.seq) return;
        this.page.set(result);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        if (seq !== this.seq) return;
        this.errorMessage.set(describeApiError(error));
        this.status.set('error');
      },
    });
  }
}
