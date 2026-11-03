import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, receiptOutline } from 'ionicons/icons';

import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { DemoAccountOrder, DemoOrderStatus } from '../../core/models/account.model';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  orderItemCount,
  orderSubtotal,
} from '../../core/services/demo-account-state.service';
import { CmcBadgeComponent } from '../../shared/ui/badge/cmc-badge.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';
import { OrdersService } from '../../core/services/orders.service';
import { ConnectedOrdersComponent } from './connected-orders.view';

/** Estados de la consulta de pedidos (HU-12). */
export type OrdersStatus = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: true,
  imports: [
    ConnectedOrdersComponent,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    CmcBadgeComponent,
    CmcEmptyStateComponent,
    CmcErrorStateComponent,
    CmcLoadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage {
  readonly connected = inject(BACKEND_SESSION_ENABLED);
  private readonly connectedView = viewChild(ConnectedOrdersComponent);
  private readonly ordersService = inject(OrdersService);

  private request = 0;
  readonly status = signal<OrdersStatus>('loading');
  readonly orders = signal<DemoAccountOrder[]>([]);

  constructor() {
    addIcons({ chevronForwardOutline, receiptOutline });
    if (!this.connected) void this.loadOrders();
  }

  // Ionic caches tab pages: refresh history each time the user returns.
  ionViewWillEnter(): void {
    if (this.connected) {
      this.connectedView()?.load(this.connectedView()?.pageNumber() ?? 0);
      return;
    }
    void this.loadOrders();
  }


  /** Carga los pedidos (más recientes primero) y controla carga y error. */
  async loadOrders(): Promise<void> {
    const request = ++this.request;
    this.status.set('loading');
    try {
      const pedidos = await this.ordersService.listMyOrders();
      if (request !== this.request) return;
      this.orders.set([...pedidos].sort((a, b) => b.date.localeCompare(a.date)));
      this.status.set('ready');
    } catch {
      if (request !== this.request) return;
      // No se muestran detalles técnicos del error (HU-12, seguridad).
      this.status.set('error');
    }
  }

  labelOf(status: DemoOrderStatus): string {
    return ORDER_STATUS_LABEL[status];
  }

  variantOf(status: DemoOrderStatus) {
    return ORDER_STATUS_VARIANT[status];
  }

  countOf(order: DemoAccountOrder): number {
    return orderItemCount(order.items);
  }

  totalOf(order: DemoAccountOrder): number {
    return orderSubtotal(order.items) + order.shipping;
  }
}
