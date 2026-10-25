import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, IonTitle, NavController, IonButtons, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, informationCircleOutline, lockClosedOutline } from 'ionicons/icons';

import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { PaymentMethodType } from '../../../core/models/checkout.model';

@Component({
  selector: 'app-payment-method',
  templateUrl: './payment-method.page.html',
  styleUrls: ['./payment-method.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonIcon,
    CmcButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodPage {
  private checkoutService = inject(DemoCheckoutStateService);
  private nav = inject(NavController);

  selectedMethod: PaymentMethodType | null = null;

  constructor() {
    addIcons({ arrowBackOutline, informationCircleOutline, lockClosedOutline });
    const current = this.checkoutService.paymentMethod();
    if (current) {
      this.selectedMethod = current.type;
    }
  }

  selectMethod(method: PaymentMethodType) {
    this.selectedMethod = method;
  }

  confirmSelection() {
    if (this.selectedMethod === 'transfer') {
      this.checkoutService.setPaymentMethod({
        type: 'transfer',
        title: 'Transferencia bancaria',
        description: 'Pago manual a cuenta'
      });
    } else if (this.selectedMethod === 'mercadopago') {
      this.checkoutService.setPaymentMethod({
        type: 'mercadopago',
        title: 'Mercado Pago',
        description: 'Tarjetas, saldo o efectivo'
      });
    }
    
    this.nav.navigateBack(['/checkout']);
  }

  goBack() {
    this.nav.navigateBack(['/checkout']);
  }
}
