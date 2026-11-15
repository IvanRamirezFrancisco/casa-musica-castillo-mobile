import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { NavController, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chevronForwardOutline, cubeOutline, cardOutline } from 'ionicons/icons';

import { BACKEND_SESSION_ENABLED } from '../../../core/config/backend-session.token';
import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { ConnectedCheckoutComponent } from '../connected-checkout.view';

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
    CmcButtonComponent,
    ConnectedCheckoutComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutSummaryPage {
  protected readonly connected = inject(BACKEND_SESSION_ENABLED);
  checkoutService = inject(DemoCheckoutStateService);
  private router = inject(Router);
  private nav = inject(NavController);

  constructor() {
    addIcons({ arrowBackOutline, chevronForwardOutline, cubeOutline, cardOutline });
  }

  canProceed(): boolean {
    return this.checkoutService.cartItems().length > 0 && !!this.checkoutService.deliveryMethod() && !!this.checkoutService.paymentMethod();
  }

  goBack() {
    this.nav.navigateBack(['/main/cart']);
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
