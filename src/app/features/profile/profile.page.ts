import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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

import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { DemoAccountStateService } from '../../core/services/demo-account-state.service';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { ConnectedProfileComponent } from './connected-profile.view';
import { PrivacyPreferencesService } from '../../core/services/privacy-preferences.service';

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
  imports: [IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, RouterLink, CmcButtonComponent, ConnectedProfileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  readonly privacy = inject(PrivacyPreferencesService);
  private readonly connectedView = viewChild(ConnectedProfileComponent);
  ionViewWillEnter(): void { if (this.connected) this.connectedView()?.reload(); }

  protected readonly connected = inject(BACKEND_SESSION_ENABLED);
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
