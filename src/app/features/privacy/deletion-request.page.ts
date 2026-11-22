import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { describeApiError } from '../../core/api/api-error-message';
import type { TwoFactorMethod } from '../../core/models/auth.model';
import {
  AccountDeletionPolicy,
  AccountDeletionReceipt,
  HttpAccountSecurityRepository,
} from '../../core/infrastructure/http-account-security.repository';
import { AuthService } from '../../core/services/auth.service';
import { ActionDialogComponent } from '../../shared/ui/action-dialog/action-dialog.component';
import { GoogleSigninButtonComponent } from '../../shared/ui/google-signin-button/google-signin-button.component';

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Component({
  selector: 'app-deletion-request',
  imports: [DatePipe, FormsModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, NgTemplateOutlet, ActionDialogComponent, GoogleSigninButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dialog()) {
      <cmc-action-dialog #panel [open]="true" title="Solicitud de eliminación" [content]="body"
        [busy]="busy() || trackingBusy() || reauthBusy()" [dirty]="!!password || !!reauthToken() || confirmed" (closed)="closeRequest()"/>
    } @else {
      <ion-header class="ion-no-border cmc-header-transparent">
        <ion-toolbar><ion-title class="cmc-title" role="heading" aria-level="1">Eliminar mi cuenta</ion-title></ion-toolbar>
      </ion-header>
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
      <section class="policy-summary" aria-labelledby="deletion-impact-title">
        <h2 id="deletion-impact-title">Qué datos se eliminan y cuáles se conservan</h2>
        <ul class="impact-list">
          <li><strong>Se elimina de forma permanente:</strong> perfil, correo, contraseña, factores 2FA/TOTP, códigos de respaldo, sesiones activas, direcciones guardadas, carrito, favoritos y reseñas.</li>
          <li><strong>Conservación obligatoria desvinculada:</strong> historial comercial y montos de pedidos concluidos sin datos personales de cuenta hasta 5 años por obligaciones fiscales (CFF Art. 30) y trazas operativas de Mercado Pago o Brevo.</li>
          <li><strong>Pedidos en curso o pagos en validación:</strong> la solicitud queda en revisión administrativa (<code>REVIEW_REQUIRED</code>) y revoca tus tokens de renovación sin cancelar automáticamente envíos o reembolsos activos.</li>
        </ul>
        <p class="policy-links">
          <a class="cmc-link" href="https://casa-musica-castillo.vercel.app/eliminar-cuenta" target="_blank" rel="noopener noreferrer">
            Solicitar o confirmar sin sesión desde la web
          </a>
          @if (dialog()) {
            <a routerLink="/privacy" class="cmc-link" (click)="closeIfClean()">Ir a privacidad y mis datos</a>
          } @else {
            <a routerLink="/privacy" class="cmc-link">Ver controles de privacidad y Aviso</a>
          }
        </p>
      </section>

      @if (receipt(); as result) {
        <section class="receipt-card" role="status" aria-live="polite">
          <h2>Comprobante de solicitud</h2>
          @if (result.status === 'COMPLETED') {
            <p><strong>La eliminación de tu cuenta se completó.</strong> Tus credenciales, 2FA, sesiones, favoritos y carrito fueron borrados.</p>
            <a routerLink="/login" class="cmc-link" (click)="closeIfClean()">Volver al inicio de sesión</a>
          } @else if (result.status === 'REVIEW_REQUIRED') {
            <p><strong>Recibimos la solicitud (en revisión operativa).</strong> Tus tokens de renovación fueron revocados; la cuenta requiere revisión previa porque existen pedidos en curso, pagos pendientes o privilegios administrativos.</p>
          } @else {
            <p><strong>Solicitud recibida.</strong> Quedó registrada en espera de validación.</p>
          }
          <dl class="receipt-meta">
            <div><dt>Folio (UUID)</dt><dd class="mono">{{ result.requestId }}</dd></div>
            <div><dt>Estado</dt><dd>{{ result.status }}</dd></div>
            <div><dt>Recibida</dt><dd>{{ result.receivedAt | date: 'medium' }}</dd></div>
            @if (result.completedAt) {
              <div><dt>Concluida</dt><dd>{{ result.completedAt | date: 'medium' }}</dd></div>
            }
          </dl>
          @if (result.status !== 'COMPLETED') {
            <button type="button" class="secondary-btn" [disabled]="trackingBusy()" (click)="lookupStatus(result.requestId)">
              {{ trackingBusy() ? 'Actualizando estado…' : 'Actualizar estado de la solicitud' }}
            </button>
          }
        </section>
      }

      @if (available() === null) {
        <p role="status">Consultando disponibilidad…</p>
      } @else if (!available()) {
        <p role="status">
          La recepción automatizada está pausada temporalmente. Escribe a {{ policy()?.supportEmail || 'soporte@casamusicacastillo.com' }} o usa el enlace web externo.
        </p>
      } @else if (!effectiveHasLocalPassword() && effectiveGoogleLinked()) {
        <form (ngSubmit)="submit()">
          @if (!reauthToken()) {
            <p>Tu cuenta inicia sesión con Google y no tiene contraseña local. Verifica tu identidad con Google para confirmar esta solicitud.</p>
            @if (effectiveMfaActive()) {
              <div class="security-mfa-box">
                <div class="security-mfa-radios" role="radiogroup" aria-label="Método de segundo factor">
                  @for (m of availableMfaMethods(); track m) {
                    <label>
                      <input type="radio" name="deletionMfaMethod" [value]="m" [checked]="deletionMfaMethod() === m" (change)="deletionMfaMethod.set(m)">
                      <span>{{ m === 'EMAIL' ? 'Correo' : m === 'GOOGLE_AUTHENTICATOR' ? 'Autenticador' : 'Código respaldo' }}</span>
                    </label>
                  }
                </div>
                @if (deletionMfaMethod() === 'EMAIL') {
                  <button type="button" class="secondary-btn" [disabled]="reauthBusy() || busy()" (click)="sendDeletionEmailCode()">
                    Enviar código a mi correo
                  </button>
                }
                <label for="deletion-mfa-code">Código de verificación</label>
                <input id="deletion-mfa-code" name="deletionMfaCode" type="text" autocomplete="one-time-code" maxlength="32" [(ngModel)]="deletionMfaCode">
              </div>
            }
            @if (reauthNotice()) {
              <p role="status">{{ reauthNotice() }}</p>
            }
            <app-google-signin-button
              context="use"
              purpose="REAUTH"
              label="Verificar con Google para eliminar"
              [disabled]="busy() || reauthBusy() || (effectiveMfaActive() && !validDeletionMfaCode())"
              (credential)="onGoogleReauth($event)"
              (cancelled)="onGoogleReauthCancelled()"
              (failed)="onGoogleReauthError($event)"
            />
          } @else {
            <p role="status">Identidad verificada con Google. Confirma debajo para enviar la solicitud.</p>
            <button type="button" class="secondary-btn" [disabled]="busy()" (click)="reauthToken.set(null)">Usar otra verificación</button>
            <label class="checkbox-row">
              <input type="checkbox" name="confirmed" [(ngModel)]="confirmed">
              <span>Confirmo que solicito eliminar permanentemente mi cuenta de Casa de Música Castillo y conozco el tratamiento de retención fiscal.</span>
            </label>
            <button type="submit" [disabled]="busy() || !confirmed">
              {{ busy() ? 'Procesando solicitud…' : 'Enviar solicitud de eliminación' }}
            </button>
          }
        </form>
      } @else {
        <form (ngSubmit)="submit()">
          <label for="deletion-password">Confirma tu contraseña actual</label>
          <input id="deletion-password" name="password" type="password" autocomplete="current-password"
            maxlength="255" required [(ngModel)]="password">
          <label class="checkbox-row">
            <input type="checkbox" name="confirmed" [(ngModel)]="confirmed">
            <span>Confirmo que solicito eliminar permanentemente mi cuenta de Casa de Música Castillo y conozco el tratamiento de retención fiscal.</span>
          </label>
          <button type="submit" [disabled]="busy() || !confirmed || !password.trim()">
            {{ busy() ? 'Procesando solicitud…' : 'Enviar solicitud de eliminación' }}
          </button>
        </form>
      }
      @if (error()) { <p role="alert" class="error-text">{{ error() }}</p> }

      <section class="lookup-section" aria-labelledby="deletion-lookup-title">
        <h2 id="deletion-lookup-title">Consultar estado por folio (sin exposición de cuenta)</h2>
        <form (ngSubmit)="lookupStatus()" class="lookup-form">
          <label for="deletion-track-id">Folio UUID de seguimiento</label>
          <input id="deletion-track-id" name="lookupRequestId" type="text" autocomplete="off"
            placeholder="Ej. 550e8400-e29b-41d4-a716-446655440000" [(ngModel)]="lookupRequestId">
          <button type="submit" class="secondary-btn" [disabled]="!available() || trackingBusy() || !isValidUuid(lookupRequestId)">
            {{ trackingBusy() ? 'Consultando folio…' : 'Consultar estado por folio' }}
          </button>
        </form>
        @if (trackingError()) { <p role="alert" class="error-text">{{ trackingError() }}</p> }
      </section>
    </ng-template>
  `,
  styles: `
    .policy-summary, .receipt-card, .lookup-section { display: grid; gap: .55rem; margin-bottom: 1rem; padding: .9rem; border-radius: .75rem; background: rgba(255, 255, 255, .65); border: 1px solid rgba(114, 47, 55, .18); }
    .impact-list { margin: 0; padding-left: 1.15rem; display: grid; gap: .45rem; font-size: .92rem; line-height: 1.4; }
    .policy-links { display: flex; flex-wrap: wrap; gap: .85rem; margin: .25rem 0 0; }
    .receipt-meta { display: grid; gap: .35rem; margin: 0; font-size: .9rem; }
    .receipt-meta dt { font-weight: 700; font-size: .78rem; text-transform: uppercase; opacity: .75; }
    .receipt-meta dd { margin: 0; word-break: break-all; }
    .mono { font-family: monospace; }
    form { display: grid; gap: .8rem; margin-bottom: .75rem; }
    .checkbox-row { display: flex; align-items: flex-start; gap: .55rem; font-size: .92rem; line-height: 1.35; }
    input[type=password], input[type=text], button { min-height: 44px; }
    input[type=password], input[type=text] { padding: .6rem .75rem; border-radius: .5rem; border: 1px solid rgba(41, 37, 36, .28); }
    button { background: #8e2834; color: white; border-radius: .5rem; padding: .7rem 1rem; font-weight: 600; border: none; cursor: pointer; }
    button.secondary-btn { background: #292524; color: #fff; }
    button:disabled { opacity: .65; cursor: not-allowed; }
    .error-text { color: #991b1b; font-weight: 600; }
  `,
})
export class DeletionRequestPage {
  readonly dialog = input(false);
  readonly hasLocalPassword = input<boolean | undefined>(undefined);
  readonly googleLinked = input<boolean | undefined>(undefined);
  readonly mfaActive = input<boolean | undefined>(undefined);
  readonly availableMfaMethods = input<readonly TwoFactorMethod[]>(['GOOGLE_AUTHENTICATOR', 'EMAIL', 'BACKUP_CODE']);
  readonly closed = output<void>();
  private readonly repo = inject(HttpAccountSecurityRepository);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly availabilitySub = takeUntilDestroyed<AccountDeletionPolicy>();
  private readonly requestsSub = takeUntilDestroyed<AccountDeletionReceipt>();
  private readonly trackSub = takeUntilDestroyed<AccountDeletionReceipt>();

  protected readonly effectiveHasLocalPassword = computed(() => {
    const explicit = this.hasLocalPassword();
    if (explicit !== undefined) return explicit;
    const authUser = typeof (this.auth as Partial<AuthService>).user === 'function' ? this.auth.user() : null;
    return authUser?.hasLocalPassword ?? true;
  });
  protected readonly effectiveGoogleLinked = computed(() => {
    const explicit = this.googleLinked();
    if (explicit !== undefined) return explicit;
    const authUser = typeof (this.auth as Partial<AuthService>).user === 'function' ? this.auth.user() : null;
    return authUser?.googleLinked ?? false;
  });
  protected readonly effectiveMfaActive = computed(() => {
    const explicit = this.mfaActive();
    if (explicit !== undefined) return explicit;
    const authUser = typeof (this.auth as Partial<AuthService>).user === 'function' ? this.auth.user() : null;
    return authUser?.twoFactorEnabled ?? false;
  });

  readonly policy = signal<AccountDeletionPolicy | null>(null);
  readonly available = signal<boolean | null>(null);
  readonly receipt = signal<AccountDeletionReceipt | null>(null);
  readonly busy = signal(false);
  readonly reauthBusy = signal(false);
  readonly reauthToken = signal<string | null>(null);
  readonly reauthNotice = signal('');
  readonly deletionMfaMethod = signal<TwoFactorMethod>('GOOGLE_AUTHENTICATOR');
  readonly error = signal('');
  readonly trackingBusy = signal(false);
  readonly trackingError = signal('');

  password = '';
  deletionMfaCode = '';
  confirmed = false;
  lookupRequestId = '';

  constructor() {
    this.repo.deletionAvailability().pipe(this.availabilitySub).subscribe({
      next: value => {
        this.policy.set(value);
        this.available.set(value.available === true);
        if (value.available) {
          this.repo.ownDeletionRequest().pipe(this.requestsSub).subscribe({
            next: receipt => {
              if (!receipt) return;
              this.receipt.set(receipt);
              this.lookupRequestId = receipt.requestId;
            },
            error: () => undefined,
          });
        }
      },
      error: () => this.available.set(false),
    });
  }

  ionViewWillLeave(): void {
    this.password = '';
    this.deletionMfaCode = '';
    this.confirmed = false;
    this.reauthToken.set(null);
    this.reauthNotice.set('');
    this.error.set('');
    this.trackingError.set('');
  }

  closeRequest(): void {
    this.ionViewWillLeave();
    this.closed.emit();
  }

  closeIfClean(): void {
    if (this.dialog() && !this.password && !this.reauthToken() && !this.confirmed && !this.busy() && !this.reauthBusy() && !this.trackingBusy()) {
      this.closeRequest();
    }
  }

  validDeletionMfaCode(): boolean {
    const code = this.deletionMfaCode.trim();
    return this.deletionMfaMethod() === 'BACKUP_CODE' ? code.length >= 6 : /^\d{6}$/.test(code);
  }

  sendDeletionEmailCode(): void {
    if (this.reauthBusy() || this.busy()) return;
    this.reauthBusy.set(true);
    this.error.set('');
    this.reauthNotice.set('');
    this.repo.sendAuthenticatedEmailTwoFactorCode().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.reauthBusy.set(false);
        this.reauthNotice.set('Enviamos un código de verificación a tu correo.');
      },
      error: (err) => {
        this.reauthBusy.set(false);
        this.error.set(describeApiError(err, 'form'));
      },
    });
  }

  onGoogleReauth(event: { idToken: string; nonce: string }): void {
    if (this.reauthBusy() || this.busy()) return;
    this.reauthBusy.set(true);
    this.error.set('');
    this.reauthNotice.set('');
    this.repo.reauthenticateWithGoogle({
      idToken: event.idToken,
      nonce: event.nonce,
      purpose: 'DELETE_ACCOUNT',
      ...(this.effectiveMfaActive() ? { mfaMethod: this.deletionMfaMethod(), mfaCode: this.deletionMfaCode.trim() } : {}),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (token) => {
        this.reauthBusy.set(false);
        this.deletionMfaCode = '';
        this.reauthToken.set(token);
      },
      error: (err) => {
        this.reauthBusy.set(false);
        this.error.set(describeApiError(err, 'form'));
      },
    });
  }

  onGoogleReauthCancelled(): void {
    this.reauthNotice.set('Verificación con Google cancelada.');
  }

  onGoogleReauthError(message: string): void {
    this.error.set(message);
  }

  isValidUuid(value: string): boolean {
    return UUID_PATTERN.test(value.trim());
  }

  submit(): void {
    const token = this.reauthToken();
    const googleFlow = !this.effectiveHasLocalPassword() && this.effectiveGoogleLinked();
    if (!this.available() || this.busy() || !this.confirmed) return;
    if (googleFlow ? !token : !this.password.trim()) return;
    this.busy.set(true);
    this.error.set('');
    const proof = googleFlow && token ? { reauthToken: token } : this.password;
    this.password = '';
    this.reauthToken.set(null);
    this.repo.requestAccountDeletion(proof, true).pipe(this.requestsSub).subscribe({
      next: receipt => {
        this.receipt.set(receipt);
        this.lookupRequestId = receipt.requestId;
        this.confirmed = false;
        this.busy.set(false);
        if (receipt.status === 'COMPLETED') {
          void this.auth.clearAfterPasswordChange();
        }
      },
      error: error => {
        this.error.set(describeApiError(error, 'form'));
        this.busy.set(false);
      },
    });
  }

  lookupStatus(explicitId?: string): void {
    const candidate = (explicitId ?? this.lookupRequestId).trim();
    if (!this.available() || this.trackingBusy() || !this.isValidUuid(candidate)) {
      if (!this.isValidUuid(candidate)) {
        this.trackingError.set('Ingresa un folio UUID válido para consultar su estado.');
      }
      return;
    }
    this.trackingBusy.set(true);
    this.trackingError.set('');
    this.repo.trackAccountDeletion(candidate).pipe(this.trackSub).subscribe({
      next: receipt => {
        this.receipt.set(receipt);
        this.lookupRequestId = receipt.requestId;
        this.trackingBusy.set(false);
      },
      error: error => {
        this.trackingError.set(describeApiError(error, 'form'));
        this.trackingBusy.set(false);
      },
    });
  }
}
