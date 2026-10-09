import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cartOutline, gridOutline, homeOutline, personOutline, receiptOutline } from 'ionicons/icons';

@Component({
  selector: 'app-main-navigation',
  templateUrl: './main-navigation.component.html',
  styleUrls: ['./main-navigation.component.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainNavigationComponent {
  constructor() {
    addIcons({ homeOutline, gridOutline, cartOutline, receiptOutline, personOutline });
  }
}
