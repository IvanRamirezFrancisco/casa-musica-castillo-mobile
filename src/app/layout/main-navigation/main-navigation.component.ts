import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cartOutline, gridOutline, homeOutline, personOutline, receiptOutline } from 'ionicons/icons';
import { DemoCheckoutStateService } from '../../core/services/demo-checkout-state.service';

/** Cantidad máxima mostrada en el indicador; arriba de este valor se muestra "99+". */
const MAX_BADGE_COUNT = 99;

@Component({
  selector: 'app-main-navigation',
  templateUrl: './main-navigation.component.html',
  styleUrls: ['./main-navigation.component.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainNavigationComponent {
  private readonly checkout = inject(DemoCheckoutStateService);

  // TT-36: indicador del carrito sincronizado con el estado compartido.
  readonly cartCount = this.checkout.itemCount;

  readonly cartBadgeText = computed(() => {
    const count = this.cartCount();
    return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : `${count}`;
  });

  /** Complemento accesible de la etiqueta "Carrito" (p. ej. ", 2 productos"). */
  readonly cartStatusText = computed(() => {
    const count = this.cartCount();
    if (count === 0) {
      return ', vacío';
    }
    return `, ${count} ${count === 1 ? 'producto' : 'productos'}`;
  });

  constructor() {
    addIcons({ homeOutline, gridOutline, cartOutline, receiptOutline, personOutline });
  }
}
