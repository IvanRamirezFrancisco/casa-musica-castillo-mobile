import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  helpCircleOutline,
  locationOutline,
  logOutOutline,
  lockClosedOutline,
  notificationsOutline,
} from 'ionicons/icons';

import { DemoAccountStateService } from '../../core/services/demo-account-state.service';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';

interface ProfileOption {
  label: string;
  icon: string;
  danger?: boolean;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, CmcButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly router = inject(Router);

  readonly profile = inject(DemoAccountStateService).profile;
  readonly initial = computed(() => this.profile().name.trim().charAt(0).toUpperCase());

  /** Visual-only entries: no behaviour is attached on purpose. */
  readonly options: ProfileOption[] = [
    { label: 'Seguridad', icon: 'lock-closed-outline' },
    { label: 'Direcciones', icon: 'location-outline' },
    { label: 'Notificaciones', icon: 'notifications-outline' },
    { label: 'Ayuda', icon: 'help-circle-outline' },
    { label: 'Cerrar sesión', icon: 'log-out-outline', danger: true },
  ];

  constructor() {
    addIcons({
      chevronForwardOutline,
      helpCircleOutline,
      locationOutline,
      logOutOutline,
      lockClosedOutline,
      notificationsOutline,
    });
  }

  editProfile(): void {
    void this.router.navigate(['/profile/edit']);
  }
}
