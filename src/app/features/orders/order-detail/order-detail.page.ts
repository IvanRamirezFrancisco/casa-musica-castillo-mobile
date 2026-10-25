import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NavController, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

import { DemoAccountOrder, DemoOrderStatus } from '../../../core/models/account.model';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  orderSubtotal,
} from '../../../core/services/demo-account-state.service';
import { CmcBadgeComponent } from '../../../shared/ui/badge/cmc-badge.component';
import { CmcEmptyStateComponent } from '../../../shared/ui/empty-state/cmc-empty-state.component';
import { CmcErrorStateComponent } from '../../../shared/ui/error-state/cmc-error-state.component';
import { CmcLoadingComponent } from '../../../shared/ui/loading/cmc-loading.component';
import { OrderDetailService } from '../../../core/services/order-detail.service';

/** Estados de la consulta del detalle (HU-13). */
export type OrderDetailStatus = 'loading' | 'ready' | 'not-found' | 'error';

const TIMELINE: DemoOrderStatus[] = ['pending', 'paid', 'shipped', 'delivered'];

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.page.html',
  styleUrls: ['./order-detail.page.scss'],
  standalone: true,
  imports: [
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    CurrencyPipe,
    DatePipe,
    CmcBadgeComponent,
    CmcEmptyStateComponent,
    CmcErrorStateComponent,
    CmcLoadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailPage {
  private readonly nav = inject(NavController);
  private readonly orderDetail = inject(OrderDetailService);
  private readonly orderId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly status = signal<OrderDetailStatus>('loading');
  readonly order = signal<DemoAccountOrder | null>(null);
  readonly statusLabel = computed(() => {
    const o = this.order();
    return o ? ORDER_STATUS_LABEL[o.status] : '';
  });
  readonly variant = computed(() => ORDER_STATUS_VARIANT[this.order()?.status ?? 'pending']);
  readonly subtotal = computed(() => orderSubtotal(this.order()?.items ?? []));
  readonly total = computed(() => this.subtotal() + (this.order()?.shipping ?? 0));

  /** Purely visual progress derived from the demo status; no real tracking. */
  readonly steps = computed(() => {
    const current = TIMELINE.indexOf(this.order()?.status ?? 'pending');
    return TIMELINE.map((s, i) => ({
      label: ORDER_STATUS_LABEL[s],
      done: i <= current,
      current: i === current,
    }));
  });

  constructor() {
    addIcons({ arrowBackOutline });
    void this.loadOrder();
  }

  /** Consulta el pedido y controla carga, inexistente y error. */
  async loadOrder(): Promise<void> {
    this.status.set('loading');
    try {
      const pedido = await this.orderDetail.getMyOrder(this.orderId);
      this.order.set(pedido);
      this.status.set(pedido ? 'ready' : 'not-found');
    } catch {
      // No se muestran detalles técnicos del error (HU-13, seguridad).
      this.status.set('error');
    }
  }

  goBack(): void {
    void this.nav.navigateBack(['/main/orders']);
  }
}
