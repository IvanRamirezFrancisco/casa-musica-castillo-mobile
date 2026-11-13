import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { gridOutline, homeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-public-navigation',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './main-navigation.component.scss',
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" class="cmc-bubble-nav" aria-label="Navegación principal">
        <ion-tab-button tab="home">
          <ion-icon aria-hidden="true" name="home-outline" />
          <ion-label>Inicio</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="catalog">
          <ion-icon aria-hidden="true" name="grid-outline" />
          <ion-label>Catálogo</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class PublicNavigationComponent {
  constructor() {
    addIcons({ homeOutline, gridOutline });
  }
}
