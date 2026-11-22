import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { IonButtons, IonContent, IonHeader, IonIcon, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, logOutOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { describeApiError } from '../../core/api/api-error-message';
import type { UserProfile } from '../../core/models/profile.model';
import { PROFILE_REPOSITORY } from '../../core/repositories/profile.repository';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PrivacyPreferencesService } from '../../core/services/privacy-preferences.service';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { CmcBrandLogoDirective } from '../../shared/ui/branding/cmc-brand-logo.directive';
import { ProfileBackDirective } from './profile-back.directive';

/**
 * Perfil conectado real (`GET /api/users/profile`). Muestra identidad real, estado de cuenta,
 * estado de segundo factor (2FA), aviso honesto sobre almacenamiento volátil de sesión (TT-05)
 * y cierre de sesión con limpieza completa de credenciales.
 */
@Component({
  selector: 'app-connected-profile-view',
  host: { class: 'ion-page' },
  standalone: true,
  imports: [
    IonHeader,
    IonButtons,
    ProfileBackDirective,
    IonToolbar,
    IonContent,
    IonIcon,
    RouterLink,
    CmcBrandLogoDirective,
    CmcButtonComponent,
    CmcLoadingComponent,
    CmcIconComponent,
    CmcErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connected-profile.view.html',
  styleUrl: './connected-profile.view.scss',
})
export class ConnectedProfileComponent implements OnInit {
  private entered = false;

  ionViewWillEnter(): void {
    if (this.entered) this.reload();
    this.entered = true;
  }

  readonly privacy = inject(PrivacyPreferencesService);
  protected readonly auth = inject(AuthService);
  private readonly repository = inject(PROFILE_REPOSITORY);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly loggingOut = signal(false);
  readonly logoutNotice = signal('');

  protected readonly initial = computed(() => {
    const p = this.profile();
    return p ? p.firstName.trim().charAt(0).toUpperCase() : '?';
  });

  private activeRequest: Subscription | null = null;

  constructor() {
    addIcons({ arrowBackOutline, logOutOutline, shieldCheckmarkOutline });
    this.auth.sessionEnded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.activeRequest?.unsubscribe();
      this.profile.set(null);
      this.error.set(null);
      this.loading.set(false);
    });
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.activeRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.activeRequest = this.repository.getProfile().subscribe({
      next: (loaded) => {
        this.loading.set(false);
        const sessionUser = this.auth.user();
        if (sessionUser && loaded.id !== sessionUser.id) {
          this.profile.set(null);
          this.error.set('La respuesta del perfil no corresponde a la sesión activa.');
          return;
        }
        this.profile.set(loaded);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.profile.set(null);
        this.error.set(describeApiError(err));
      },
    });
  }

  protected twoFactorSummary(user: UserProfile): string {
    if (!user.twoFactorEnabled) return 'Desactivado';
    const methods: string[] = [];
    if (user.emailTwoFactorEnabled) methods.push('Correo');
    if (user.totpEnabled) methods.push('App autenticadora');
    if (user.backupCodesEnabled) methods.push('Códigos de respaldo');
    return methods.length ? `Activo (${methods.join(', ')})` : 'Activo';
  }

  goToSecurity(): void { void this.router.navigate(['/profile/security']); }
  goToOrders(): void { void this.router.navigate(['/main/orders']); }
  goToFavorites(): void { void this.router.navigate(['/favorites']); }

  goToEditProfile(): void {
    void this.router.navigate(['/profile/edit']);
  }

  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.logoutNotice.set('');
    this.auth.logout().subscribe(({ remoteRevoked }) => {
      this.loggingOut.set(false);
      if (!remoteRevoked) {
        const message = 'Sesión local cerrada; el servidor no confirmó la revocación remota.';
        this.logoutNotice.set(message);
        this.notifications.warning('Sesión cerrada localmente', message);
      } else {
        this.notifications.success('Sesión cerrada', 'Tu sesión se cerró correctamente.');
      }
      void this.router.navigate(['/login'], { replaceUrl: true });
    });
  }
}
