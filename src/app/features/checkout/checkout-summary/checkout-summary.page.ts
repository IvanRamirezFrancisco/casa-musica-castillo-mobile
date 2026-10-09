import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chevronForwardOutline, cubeOutline, cardOutline } from 'ionicons/icons';

import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';

@Component({
  selector: 'app-checkout-summary',
  templateUrl: './checkout-summary.page.html',
  styleUrls: ['./checkout-summary.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonIcon,
    CurrencyPipe,
    CmcButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutSummaryPage {
  checkoutService = inject(DemoCheckoutStateService);
  private router = inject(Router);

  constructor() {
    addIcons({ arrowBackOutline, chevronForwardOutline, cubeOutline, cardOutline });
  }

  canProceed(): boolean {
    return !!this.checkoutService.deliveryMethod() && !!this.checkoutService.paymentMethod();
  }

  goBack() {
    this.router.navigate(['/main/cart']);
  }

  goToDelivery() {
    this.router.navigate(['/checkout/delivery']);
  }

  goToPayment() {
    this.router.navigate(['/checkout/payment']);
  }

  confirmOrder() {
    if (this.canProceed()) {
      this.router.navigate(['/checkout/confirmation']);
    }
  }
}
