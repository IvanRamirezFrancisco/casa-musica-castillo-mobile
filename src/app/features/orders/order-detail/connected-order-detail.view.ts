import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { Subject, catchError, forkJoin, of, takeUntil } from 'rxjs';
import { ApiError } from '../../../core/api/api-error';
import { describeApiError } from '../../../core/api/api-error-message';
import type { OrderTimelineEvent, RealOrder } from '../../../core/models/order.model';
import { REAL_ORDER_REPOSITORY } from '../../../core/repositories/real-order.repository';
import { AuthService } from '../../../core/services/auth.service';
import { CmcBadgeComponent } from '../../../shared/ui/badge/cmc-badge.component';
import { CmcEmptyStateComponent } from '../../../shared/ui/empty-state/cmc-empty-state.component';
import { CmcErrorStateComponent } from '../../../shared/ui/error-state/cmc-error-state.component';
import { CmcLoadingComponent } from '../../../shared/ui/loading/cmc-loading.component';
import { orderVariant, paymentVariant } from '../connected-orders.view';

@Component({
  selector: 'app-connected-order-detail',
  standalone: true,
  imports: [
    RouterLink, CurrencyPipe, DatePipe, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar,
    CmcBadgeComponent, CmcEmptyStateComponent, CmcErrorStateComponent, CmcLoadingComponent,
  ],
  host: { class: 'ion-page' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    '.card { background:var(--cmc-surface); border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:var(--cmc-shadow-card); display:grid; gap:8px; }',
    '.row { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }',
    '.list { list-style:none; padding:0; margin:0; display:grid; gap:10px; }',
    '.back { min-width:44px; min-height:44px; background:transparent; border:0; display:inline-flex; align-items:center; justify-content:center; }',
  ],
  template: `
    <ion-header class="ion-no-border cmc-header-transparent">
      <ion-toolbar>
        <ion-buttons slot="start">
          <button type="button" class="back" aria-label="Volver a mis pedidos" (click)="goBack()">
            <ion-icon name="arrow-back-outline" aria-hidden="true"></ion-icon>
          </button>
        </ion-buttons>
        <ion-title class="cmc-title" role="heading" aria-level="1">Detalle del pedido</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="cmc-page">
      <main class="cmc-page-container cmc-account">
        @switch (status()) {
          @case ('loading') { <cmc-loading message="Consultando el pedido" /> }
          @case ('not-found') {
            <cmc-empty-state heading="Pedido no encontrado" description="No encontramos este pedido en tu cuenta." />
          }
          @case ('error') {
            <cmc-error-state heading="No pudimos cargar el pedido" [description]="errorMessage()" (retry)="reload()" />
          }
          @case ('ready') {
            @if (order(); as o) {
              <section class="card" aria-label="Resumen del pedido">
                <div class="row">
                  <h2 class="cmc-title">{{ o.orderNumber }}</h2>
                  <span class="cmc-caption">{{ o.orderDate | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="row">
                  <span>Estado del pedido</span>
                  <cmc-badge [variant]="orderBadge(o.status)">{{ o.statusLabel }}</cmc-badge>
                </div>
                <div class="row">
                  <span>Estado del pago</span>
                  <cmc-badge [variant]="paymentBadge(o.paymentStatus)">{{ o.paymentStatusLabel }}</cmc-badge>
                </div>
                <div class="row">
                  <span>Estado del envío</span>
                  <cmc-badge variant="neutral">{{ o.shippingStatusLabel }}</cmc-badge>
                </div>
                <p class="cmc-caption">Entrega: {{ o.deliveryLabel }}</p>
              </section>

              <section class="card" aria-label="Productos del pedido">
                <h3 class="cmc-title">Productos ({{ o.totalItems }})</h3>
                <ul class="list">
                  @for (item of o.items; track item.id) {
                    <li class="row">
                      <span>
                        @if (item.productId) {
                          <a class="cmc-link" [routerLink]="['/products', item.productId]">{{ item.productName }}</a>
                        } @else {
                          {{ item.productName }}
                        }
                        <span class="cmc-caption"> × {{ item.quantity }}</span>
                      </span>
                      <strong>{{ item.subtotal | currency:'MXN' }}</strong>
                    </li>
                  }
                </ul>
              </section>

              <section class="card" aria-label="Importes del pedido">
                <h3 class="cmc-title">Importes</h3>
                <div class="row"><span>Subtotal</span><span>{{ o.subtotal | currency:'MXN' }}</span></div>
                @if (o.discount > 0) {
                  <div class="row"><span>Descuento</span><span>-{{ o.discount | currency:'MXN' }}</span></div>
                }
                <div class="row"><span>Impuestos</span><span>{{ o.tax | currency:'MXN' }}</span></div>
                <div class="row"><span>Envío</span><span>{{ o.shipping | currency:'MXN' }}</span></div>
                <div class="row"><strong class="cmc-title">Total</strong><strong class="cmc-title">{{ o.total | currency:'MXN' }}</strong></div>
              </section>

              <section class="card" aria-label="Historial de estados">
                <h3 class="cmc-title">Historial de estados</h3>
                @if (timeline().length === 0) {
                  <p class="cmc-caption">Aún no hay eventos registrados para este pedido.</p>
                } @else {
                  <ol class="list">
                    @for (ev of timeline(); track ev.id) {
                      <li>
                        <strong>{{ ev.title }}</strong>
                        <p class="cmc-caption">{{ ev.createdAt | date:'dd/MM/yyyy HH:mm' }}@if (ev.actorLabel) { · {{ ev.actorLabel }} }</p>
                        @if (ev.description) { <p class="cmc-body">{{ ev.description }}</p> }
                      </li>
                    }
                  </ol>
                }
              </section>
            }
          }
        }
      </main>
    </ion-content>
  `,
})
export class ConnectedOrderDetailComponent {
  private readonly repository = inject(REAL_ORDER_REPOSITORY);
  private readonly nav = inject(NavController);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelled = new Subject<void>();
  private currentId = 0;
  private cached = false;

  readonly status = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  readonly order = signal<RealOrder | null>(null);
  readonly timeline = signal<readonly OrderTimelineEvent[]>([]);
  readonly errorMessage = signal('');
  readonly orderBadge = orderVariant;
  readonly paymentBadge = paymentVariant;

  constructor() {
    addIcons({ arrowBackOutline });
    inject(AuthService).sessionEnded$.pipe(takeUntilDestroyed()).subscribe(() => this.clear());
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const raw = params.get('id') ?? '';
      const id = Number(raw);
      if (!/^[1-9][0-9]*$/.test(raw) || !Number.isSafeInteger(id)) {
        this.currentId = 0;
        this.clear();
        this.status.set('not-found');
        return;
      }
      this.currentId = id;
      this.reload();
    });
  }

  reload(): void {
    if (!this.currentId) { this.status.set('not-found'); return; }
    this.clear();
    this.status.set('loading');
    forkJoin({
      order: this.repository.findById(this.currentId),
      timeline: this.repository.timeline(this.currentId).pipe(catchError(() => of([] as const))),
    }).pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ order, timeline }) => {
        this.order.set(order);
        this.timeline.set(timeline);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) {
          this.status.set('not-found');
          return;
        }
        this.errorMessage.set(describeApiError(error));
        this.status.set('error');
      },
    });
  }

  ionViewWillLeave(): void {
    this.cached = true;
    this.clear();
  }

  ionViewWillEnter(): void {
    if (!this.cached) return;
    this.cached = false;
    this.reload();
  }

  private clear(): void {
    this.cancelled.next();
    this.order.set(null);
    this.timeline.set([]);
    this.errorMessage.set('');
    this.status.set('loading');
  }

  goBack(): void {
    void this.nav.navigateBack(['/main/orders']);
  }
}
