import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from '../../core/api/api-client.service';
import { describeApiError } from '../../core/api/api-error-message';
import { AuthService } from '../../core/services/auth.service';
import { ActionDialogComponent } from '../../shared/ui/action-dialog/action-dialog.component';

interface Receipt {
  requestId: string;
  status: 'RECEIVED' | 'REVIEW_REQUIRED' | 'COMPLETED';
  receivedAt: string;
}

@Component({
  selector: 'app-deletion-request',
  imports: [FormsModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, NgTemplateOutlet, ActionDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dialog()) {
      <cmc-action-dialog #panel [open]="true" title="Solicitud de eliminación" [content]="body"
        [busy]="busy()" [dirty]="!!password || confirmed" (closed)="closeRequest()"/>
    } @else {
      <ion-header><ion-toolbar><ion-title>Eliminar mi cuenta</ion-title></ion-toolbar></ion-header>
      <ion-content class="cmc-page cmc-standalone-page">
        <main class="cmc-page-container cmc-account">
          <a routerLink="/privacy" class="cmc-link">Volver a privacidad</a>
          <section class="surface">
            <h1>Solicitud de eliminación</h1>
            <ng-container [ngTemplateOutlet]="body"/>
          </section>
        </main>
      </ion-content>
    }
    <ng-template #body>
          <p>La eliminación afecta el acceso a tu cuenta, tus favoritos y tu carrito. Algunos registros de pedidos podrían conservarse por obligaciones aplicables.</p>
          @if (receipt(); as result) {
            @if (result.status === 'COMPLETED') {
              <p role="status">La eliminación de tu cuenta se completó.</p>
              <a routerLink="/login" class="cmc-link">Volver al inicio de sesión</a>
            } @else if (result.status === 'REVIEW_REQUIRED') {
              <p role="status">Recibimos la solicitud. Los datos asociados requieren revisión.</p>
            } @else {
              <p role="status">Solicitud recibida.</p>
            }
            <p>Guarda el identificador para consultar el estado en el sitio web: {{ result.requestId }}.</p>
          } @else if (available() === null) {
            <p role="status">Consultando disponibilidad…</p>
          } @else if (!available()) {
            <p role="status">La recepción de solicitudes aún no está disponible.</p>
          } @else {
            <form (ngSubmit)="submit()">
              <label for="deletion-password">Confirma tu contraseña actual</label>
              <input id="deletion-password" name="password" type="password" autocomplete="current-password"
                maxlength="255" required [(ngModel)]="password">
              <label><input type="checkbox" name="confirmed" [(ngModel)]="confirmed"> Confirmo que quiero solicitar la eliminación de mi cuenta.</label>
              <button type="submit" [disabled]="busy() || !confirmed || !password.trim()">Enviar solicitud</button>
            </form>
          }
          @if (error()) { <p role="alert">{{ error() }}</p> }
    </ng-template>
  `,
  styles: `
    form { display: grid; gap: .8rem; }
    input[type=password], button { min-height: 44px; }
    button { background: #8e2834; color: white; border-radius: .5rem; padding: .7rem 1rem; }
    button:disabled { opacity: .65; }
  `,
})
export class DeletionRequestPage {
  readonly dialog = input(false);
  readonly closed = output<void>();
  private readonly api = inject(ApiClientService);
  private readonly auth = inject(AuthService);
  private readonly availability = takeUntilDestroyed<{ available: boolean }>();
  private readonly requests = takeUntilDestroyed<Receipt>();
  readonly available = signal<boolean | null>(null);
  readonly receipt = signal<Receipt | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  password = '';
  confirmed = false;

  constructor() {
    this.api.get<{ available: boolean }>('/api/public/legal/deletion').pipe(this.availability).subscribe({
      next: value => {
        this.available.set(value.available === true);
        if (value.available) this.api.get<Receipt>('/api/users/me/deletion-requests', undefined, { auth: true })
          .pipe(this.requests).subscribe({ next: receipt => this.receipt.set(receipt), error: () => undefined });
      },
      error: () => this.available.set(false),
    });
  }

  ionViewWillLeave(): void { this.password = ''; this.confirmed = false; }

  closeRequest(): void {
    this.ionViewWillLeave();
    this.closed.emit();
  }

  submit(): void {
    if (!this.available() || this.busy() || !this.confirmed || !this.password.trim()) return;
    this.busy.set(true);
    this.error.set('');
    const body = { currentPassword: this.password, confirmed: true };
    this.password = '';
    this.api.post<Receipt>('/api/users/me/deletion-requests', body, { auth: true }).pipe(this.requests).subscribe({
      next: receipt => {
        this.receipt.set(receipt);
        this.confirmed = false;
        this.busy.set(false);
        if (receipt.status === 'COMPLETED') void this.auth.clearAfterPasswordChange();
      },
      error: error => { this.error.set(describeApiError(error, 'form')); this.busy.set(false); },
    });
  }
}
