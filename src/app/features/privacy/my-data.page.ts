import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { PrivacyDataService } from '../../core/services/privacy-data.service';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';

@Component({
  selector: 'app-my-privacy-data', standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, RouterLink, CmcButtonComponent],
  providers: [PrivacyDataService], styleUrl: './privacy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border cmc-header-transparent">
      <ion-toolbar><ion-title class="cmc-title" role="heading" aria-level="1">Datos de mi cuenta</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="cmc-page cmc-standalone-page">
      <div class="cmc-page-container privacy-shell">
        <a routerLink="/privacy" class="cmc-link">Volver a privacidad</a>
        <p>Consulta del perfil disponible en el servidor. No incluye una copia integral de tus datos ni modifica tu cuenta.</p>
        <section class="privacy-card" aria-label="Consulta de datos propios" [attr.aria-busy]="data.loading()">
          @if (data.loading()) { <p role="status">Consultando los datos de tu cuenta...</p> }
          @if (data.error()) { <p role="alert">{{ data.error() }}</p> }
          @if (data.profile(); as profile) {
            <dl>
              <dt>Nombre</dt><dd>{{ profile.fullName }}</dd>
              <dt>Correo electrónico</dt><dd>{{ profile.email }}</dd>
              <dt>Teléfono</dt><dd>{{ profile.phone ?? 'Sin teléfono registrado' }}</dd>
              <dt>Estado de cuenta</dt><dd>{{ profile.enabled ? 'Activa' : 'Pendiente' }}</dd>
              <dt>Segundo factor</dt><dd>{{ profile.twoFactorEnabled ? 'Activo' : 'Desactivado' }}</dd>
              <dt>Creación de cuenta</dt><dd>{{ profile.createdAt ?? 'No disponible' }}</dd>
              <dt>Última actualización</dt><dd>{{ profile.updatedAt ?? 'No disponible' }}</dd>
            </dl>
          }
          @if (data.connected) { <cmc-button variant="secondary" fullWidth [loading]="data.loading()" loadingLabel="Consultando datos" (click)="data.load()">Actualizar consulta</cmc-button> }
        </section>
      </div>
    </ion-content>
  `,
})
export class MyPrivacyDataPage implements OnInit {
  readonly data = inject(PrivacyDataService);
  private active = false;
  ngOnInit(): void { this.ionViewWillEnter(); }
  ionViewWillEnter(): void {
    if (this.active) return;
    this.active = true;
    this.data.load();
  }
  // Ionic can cache pages without destroying their injector. Clear on leave as well as destroy.
  ionViewWillLeave(): void { this.active = false; this.data.clear(); }
}
