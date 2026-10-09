import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, receiptOutline } from 'ionicons/icons';

import { DemoAccountOrder, DemoOrderStatus } from '../../core/models/account.model';
import {
  DemoAccountStateService,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  orderItemCount,
  orderSubtotal,
} from '../../core/services/demo-account-state.service';
import { CmcBadgeComponent } from '../../shared/ui/badge/cmc-badge.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage {
  readonly orders = inject(DemoAccountStateService).orders;

  constructor() {
    addIcons({ chevronForwardOutline, receiptOutline });
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
