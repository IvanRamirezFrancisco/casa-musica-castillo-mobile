import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, receiptOutline } from 'ionicons/icons';

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

/** Estados de la consulta de pedidos (HU-12). */
export type OrdersStatus = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: true,
  imports: [
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
  private readonly ordersService = inject(OrdersService);

  readonly status = signal<OrdersStatus>('loading');
  readonly orders = signal<DemoAccountOrder[]>([]);

  constructor() {
    addIcons({ chevronForwardOutline, receiptOutline });
    void this.loadOrders();
  }

  /** Carga los pedidos (más recientes primero) y controla carga y error. */
  async loadOrders(): Promise<void> {
    this.status.set('loading');
    try {
      const pedidos = await this.ordersService.listMyOrders();
      this.orders.set([...pedidos].sort((a, b) => b.date.localeCompare(a.date)));
      this.status.set('ready');
    } catch {
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
