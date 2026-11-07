import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { describeApiError } from '../../core/api/api-error-message';
import type { UserProfile } from '../../core/models/profile.model';
import { PROFILE_REPOSITORY } from '../../core/repositories/profile.repository';
import { AuthService } from '../../core/services/auth.service';
import { CmcBadgeComponent } from '../../shared/ui/badge/cmc-badge.component';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';

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
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    CmcBadgeComponent,
    CmcButtonComponent,
    CmcLoadingComponent,
    CmcIconComponent,
    CmcErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    '.profile-shell { display: grid; gap: 16px; }',
    '.profile-card { background: var(--cmc-surface, #fff); border: 1px solid rgba(114, 47, 55, 0.14); border-radius: 14px; padding: 18px; display: grid; gap: 12px; }',
    '.avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--cmc-primary, #722f37); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 1.35rem; }',
    '.field-grid { display: grid; gap: 8px; margin: 0; }',
    '.field-row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(0,0,0,0.07); padding-bottom: 8px; }',
    '.field-row dt { color: var(--cmc-text-secondary, #5c5346); font-size: 0.9rem; }',
    '.field-row dd { margin: 0; font-weight: 600; text-align: right; word-break: break-word; }',
    '.session-note { background: #fff6e0; color: #5c4300; border-left: 4px solid #c59b27; padding: 12px 14px; border-radius: 8px; font-size: 0.88rem; display: flex; gap: 10px; align-items: flex-start; }',
  ],
  template: `
    <ion-header class="ion-no-border cmc-header-transparent">
      <ion-toolbar>
        <ion-title class="cmc-title" role="heading" aria-level="1">Perfil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="cmc-page cmc-root-page">
      <div class="cmc-page-container cmc-account profile-shell">
        @if (loading() && !profile()) {
          <cmc-loading message="Consultando perfil de tu cuenta..."></cmc-loading>
        } @else if (error() && !profile()) {
          <cmc-error-state
            heading="No pudimos cargar tu perfil"
            [description]="error()!"
            retryLabel="Reintentar"
            (retry)="reload()"
          ></cmc-error-state>
        } @else if (profile(); as user) {
          <section class="profile-card" aria-label="Datos de la cuenta">
            <div class="avatar" aria-hidden="true">{{ initial() }}</div>
            <div>
              <h2 class="cmc-title">{{ user.fullName }}</h2>
              <p class="cmc-text-secondary">{{ user.email }}</p>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 8px">
              <cmc-badge [variant]="user.enabled ? 'success' : 'warning'">
                {{ user.enabled ? 'Cuenta verificada y activa' : 'Verificación pendiente' }}
              </cmc-badge>
              <cmc-badge [variant]="user.twoFactorEnabled ? 'success' : 'neutral'">
                {{ user.twoFactorEnabled ? '2FA activo' : '2FA desactivado' }}
              </cmc-badge>
            </div>

            <dl class="field-grid">
              <div class="field-row">
                <dt>Nombre</dt>
                <dd>{{ user.firstName }}</dd>
              </div>
              <div class="field-row">
                <dt>Apellido</dt>
                <dd>{{ user.lastName }}</dd>
              </div>
              <div class="field-row">
                <dt>Correo electrónico</dt>
                <dd>{{ user.email }}</dd>
              </div>
              <div class="field-row">
                <dt>Teléfono</dt>
                <dd>{{ user.phone ?? 'Sin teléfono registrado' }}</dd>
              </div>
              <div class="field-row">
                <dt>Segundo factor (2FA)</dt>
                <dd>{{ twoFactorSummary(user) }}</dd>
              </div>
            </dl>

            <cmc-button variant="secondary" fullWidth (click)="goToEditProfile()">
              Información sobre edición de perfil
            </cmc-button>
          </section>

          <section class="profile-card" aria-label="Accesos de tu cuenta">
            <cmc-button variant="secondary" fullWidth (click)="goToOrders()"><cmc-icon name="cart"/> Mis pedidos</cmc-button>
            <cmc-button variant="secondary" fullWidth (click)="goToFavorites()"><cmc-icon name="heart"/> Mis favoritos</cmc-button>
            <cmc-button variant="secondary" fullWidth (click)="goToSecurity()"><cmc-icon name="security"/> Seguridad de la cuenta</cmc-button>
          </section>

          @if (!auth.persistent) {
            <div class="session-note" role="note">
              <ion-icon name="shield-checkmark-outline" aria-hidden="true"></ion-icon>
              <span>
                Tu sesión se mantiene mientras la aplicación está en ejecución. Si la aplicación se reinicia, deberás iniciar sesión de nuevo.
              </span>
            </div>
          }

          @if (logoutNotice()) {
            <p class="session-note" role="status">{{ logoutNotice() }}</p>
          }

          <section class="profile-card" aria-label="Sesión">
            <cmc-button
              variant="secondary"
              fullWidth
              [loading]="loggingOut()"
              loadingLabel="Cerrando sesión"
              (click)="logout()"
            >
              Cerrar sesión
            </cmc-button>
          </section>
        }
      </div>
    </ion-content>
  `,
})
export class ConnectedProfileComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly repository = inject(PROFILE_REPOSITORY);
  private readonly router = inject(Router);
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
    addIcons({ logOutOutline, shieldCheckmarkOutline });
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
        this.logoutNotice.set('Sesión local cerrada; el servidor no confirmó la revocación remota.');
      }
      void this.router.navigate(['/login'], { replaceUrl: true });
    });
  }
}
