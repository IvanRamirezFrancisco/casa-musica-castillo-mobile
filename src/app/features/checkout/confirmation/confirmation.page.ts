import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { NavController, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, warningOutline } from 'ionicons/icons';

import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { DemoOrder } from '../../../core/models/checkout.model';

@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.page.html',
  styleUrls: ['./confirmation.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    CurrencyPipe,
    CmcButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationPage implements OnInit {
  private checkoutService = inject(DemoCheckoutStateService);
  private router = inject(Router);
  private nav = inject(NavController);

  order = signal<DemoOrder | null>(null);

  constructor() {
    addIcons({ checkmarkCircle, warningOutline });
  }

  ngOnInit() {
    // Direct navigation must not render a success state for incomplete demo data.
    if (!this.checkoutService.deliveryMethod() || !this.checkoutService.paymentMethod() ||
        this.checkoutService.cartItems().length === 0) {
      void this.router.navigate(['/checkout'], { replaceUrl: true });
      return;
    }
    this.order.set(this.checkoutService.placeOrder());
    // In a real app we might clear checkout here, but let's clear it on leave
  }

  goToHome() {
    this.checkoutService.clearCheckout();
    this.nav.navigateRoot(['/main/home'], { replaceUrl: true });
  }

  goToOrders() {
    this.checkoutService.clearCheckout();
    this.nav.navigateRoot(['/main/orders'], { replaceUrl: true });
  }
}
