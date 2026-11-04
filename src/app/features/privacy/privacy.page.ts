import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { PrivacyPreferencesService } from '../../core/services/privacy-preferences.service';

@Component({
  selector: 'app-privacy', standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, RouterLink],
  templateUrl: './privacy.page.html', styleUrl: './privacy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPage {
  readonly preferences = inject(PrivacyPreferencesService);
  changeVisibility(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.preferences.setHideContact(input.checked);
    input.checked = this.preferences.hideContact();
  }
}
