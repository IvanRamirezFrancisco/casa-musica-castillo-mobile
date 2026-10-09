import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, locationOutline, homeOutline } from 'ionicons/icons';

import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { DeliveryMethodType } from '../../../core/models/checkout.model';

@Component({
  selector: 'app-delivery-method',
  templateUrl: './delivery-method.page.html',
  styleUrls: ['./delivery-method.page.scss'],
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
export class DeliveryMethodPage {
  private checkoutService = inject(DemoCheckoutStateService);
  private router = inject(Router);

  selectedMethod: DeliveryMethodType | null = null;

  constructor() {
    addIcons({ arrowBackOutline, locationOutline, homeOutline });
    const current = this.checkoutService.deliveryMethod();
    if (current) {
      this.selectedMethod = current.type;
    }
  }

  selectMethod(method: DeliveryMethodType) {
    this.selectedMethod = method;
  }

  confirmSelection() {
    if (this.selectedMethod === 'store') {
      this.checkoutService.setDeliveryMethod({
        type: 'store',
        title: 'Recoger en tienda',
        description: 'Av. Juárez 123, Centro',
        cost: 0
      });
    } else if (this.selectedMethod === 'home') {
      this.checkoutService.setDeliveryMethod({
        type: 'home',
        title: 'Envío a domicilio',
        description: 'Calle Roma 45, Col. Condesa',
        cost: 150
      });
    }
    
    this.router.navigate(['/checkout']);
  }

  goBack() {
    this.router.navigate(['/checkout']);
  }
}
