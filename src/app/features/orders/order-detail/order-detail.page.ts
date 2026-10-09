import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

import { DemoOrderStatus } from '../../../core/models/account.model';
import {
  DemoAccountStateService,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  orderSubtotal,
} from '../../../core/services/demo-account-state.service';
import { CmcBadgeComponent } from '../../../shared/ui/badge/cmc-badge.component';
import { CmcEmptyStateComponent } from '../../../shared/ui/empty-state/cmc-empty-state.component';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailPage {
  private readonly router = inject(Router);
  private readonly account = inject(DemoAccountStateService);
  private readonly orderId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly order = computed(() => this.account.orders().find((o) => o.id === this.orderId));
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
  }

  goBack(): void {
    void this.router.navigate(['/main/orders']);
  }
}
