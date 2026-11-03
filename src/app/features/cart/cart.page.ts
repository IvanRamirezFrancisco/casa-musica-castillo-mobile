import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBadge, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline, addOutline, removeOutline, imageOutline, cartOutline } from 'ionicons/icons';

import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { CartService } from '../../core/services/cart.service';
import { DemoCheckoutStateService } from '../../core/services/demo-checkout-state.service';
import { CmcInputComponent } from '../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';
import { ConnectedCartComponent } from './connected-cart.view';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: true,
  imports: [
    ConnectedCartComponent,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBadge,
    IonIcon,
    CurrencyPipe,
    ReactiveFormsModule,
    CmcInputComponent,
    CmcButtonComponent,
    CmcEmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  readonly connected = inject(BACKEND_SESSION_ENABLED);
  private readonly realCart = inject(CartService);
  checkoutService = inject(DemoCheckoutStateService);
  private router = inject(Router);

  couponControl = new FormControl('');

  constructor() {
    addIcons({ trashOutline, addOutline, removeOutline, imageOutline, cartOutline });
  }

  ionViewWillEnter(): void {
    if (this.connected) this.realCart.load();
  }

  updateQuantity(id: string, delta: number) {
    this.checkoutService.updateQuantity(id, delta);
  }

  removeItem(id: string) {
    this.checkoutService.removeItem(id);
  }

  applyCoupon() {
    // Demo implementation
    if (this.couponControl.value) {
      this.couponControl.setValue('');
    }
  }

  goToCatalog() {
    this.router.navigate(['/main/catalog']);
  }

  continueToCheckout() {
    this.router.navigate(['/checkout']);
  }
}
