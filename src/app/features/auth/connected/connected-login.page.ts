import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, keyOutline, phonePortraitOutline } from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { CmcIconComponent } from '../../../shared/ui/icon/cmc-icon.component';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { describeApiError } from '../../../core/api/api-error-message';
import { ApiError } from '../../../core/api/api-error';
import type { TwoFactorChallenge, TwoFactorMethod } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CONNECTED_QA } from '../../../core/config/connected-qa.token';
import { safeReturnUrl } from '../../../core/security/auth.guard';
import { GoogleRegistrationStateService } from '../../../core/services/google-registration-state.service';
import { emailValidator, otpValidator } from '../../../core/validation/auth-fields.validation';
import { GoogleSigninButtonComponent } from '../../../shared/ui/google-signin-button/google-signin-button.component';
import { OtpInputComponent } from '../../../shared/ui/otp-input/otp-input.component';
import { CmcBrandLogoDirective } from '../../../shared/ui/branding/cmc-brand-logo.directive';

const METHOD_LABELS: Record<TwoFactorMethod, string> = {
  EMAIL: 'Código por correo',
  GOOGLE_AUTHENTICATOR: 'Aplicación autenticadora',
  BACKUP_CODE: 'Código de respaldo',
};

/**
 * Inicio de sesión real. Distingue sesión autenticada de desafío 2FA: el segundo paso solo aparece
 * cuando el servidor lo exige y la contraseña se descarta del formulario apenas se valida.
 */
@Component({
  selector: 'app-connected-login',
  templateUrl: './connected-login.page.html',
  styleUrls: ['../login/login.page.scss', './connected-login.page.scss'],
  host: { class: 'ion-page' },
  standalone: true,
  imports: [IonContent, IonIcon, ReactiveFormsModule, RouterLink, CmcBrandLogoDirective, CmcIconComponent, CmcInputComponent, CmcButtonComponent, OtpInputComponent, GoogleSigninButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedLoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly registrationState = inject(GoogleRegistrationStateService);
  private loginDestination = '/main/home';
  private currentReturnUrl(fallback = '/main/home'): string {
    if (this.passwordChanged() || this.passwordConfigured() || this.auth.sessionExpired()) return fallback;
    // Ionic caches views and their ActivatedRoute. Only the current Login URL expresses
    // this visit's intent; an earlier snapshot must not restore a private destination.
    const tree = this.router.parseUrl(this.router.url);
    if (tree.root.children['primary']?.segments.map(segment => segment.path).join('/') !== 'login') return fallback;
    return safeReturnUrl(tree.queryParams['returnUrl'], fallback);
  }
  protected authReturnParams(): { returnUrl?: string } {
    const destination = this.currentReturnUrl('');
    return destination ? { returnUrl: destination } : {};
  }

  protected readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  protected readonly connectedQa = inject(CONNECTED_QA);
  private readonly cancelled = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);

  protected readonly methodLabels = METHOD_LABELS;
  protected readonly methodNames: Record<TwoFactorMethod, string> = {
    EMAIL: 'Correo', GOOGLE_AUTHENTICATOR: 'App', BACKUP_CODE: 'Respaldo',
  };
  protected readonly step = signal<'credentials' | 'second-factor'>('credentials');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly googleLinkRequired = signal(false);
  protected readonly verificationSuggested = signal(false);
  protected readonly infoMessage = signal('');
  protected readonly passwordChanged = signal(false);
  protected readonly passwordConfigured = signal(false);
  protected readonly continueTo = signal<string | null>(null);
  protected readonly challenge = signal<TwoFactorChallenge | null>(null);
  protected readonly method = signal<TwoFactorMethod>('EMAIL');
  protected readonly emailCodeSent = signal(false);
  protected readonly emailDeliveryUncertain = signal(false);
  protected readonly retryCode = signal(false);
  protected readonly resendSeconds = signal(0);
  private resendTimer: ReturnType<typeof setInterval> | undefined;

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, emailValidator]],
    password: ['', [Validators.required, Validators.maxLength(255)]],
  });
  protected readonly codeForm = this.fb.group({
    code: ['', [otpValidator(() => this.method())]],
  });

  private readonly factorTitle = viewChild<ElementRef<HTMLElement>>('factorTitle');
  private readonly googleButton = viewChild(GoogleSigninButtonComponent);

  constructor() {
    addIcons({ arrowBackOutline, keyOutline, phonePortraitOutline });
    afterRenderEffect(() => this.factorTitle()?.nativeElement.focus({ preventScroll: true }));
    this.destroyRef.onDestroy(() => clearInterval(this.resendTimer));
    this.syncEntryState();
  }

  protected onGoogleCredential(event: { idToken: string; nonce: string }): void {
    if (this.connectedQa || this.submitting() || this.continueTo()) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.googleLinkRequired.set(false);
    this.registrationState.clearLinkIntent();
    this.verificationSuggested.set(false);
    this.loginDestination = this.currentReturnUrl();
    this.auth.acknowledgeExpiry();
    this.auth.authenticateWithGoogle(event.idToken, event.nonce)
      .pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          if (result.kind === 'authenticated') {
            this.finish();
            return;
          }
          if (result.kind === 'registration-required') {
            this.registrationState.set(result.pending, this.loginDestination, 'login');
            void this.router.navigateByUrl('/complete-account');
            return;
          }
          this.enterSecondFactor(result.challenge);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          if (error instanceof ApiError && error.status === 409) {
            this.registrationState.setLinkIntent();
            this.googleLinkRequired.set(true);
            this.errorMessage.set('');
            this.infoMessage.set('');
            this.verificationSuggested.set(false);
            document.querySelector<HTMLInputElement>('app-connected-login input[type="email"]')?.focus();
            return;
          }
          this.errorMessage.set(describeApiError(error, 'auth'));
          this.verificationSuggested.set(false);
        },
      });
  }

  protected dismissGoogleLinkGuidance(): void {
    this.googleLinkRequired.set(false);
    this.registrationState.clearLinkIntent();
  }

  protected onGoogleCancelled(): void {
    this.errorMessage.set('');
    this.infoMessage.set('Inicio de sesión con Google cancelado. Puedes intentar de nuevo o usar tu correo.');
  }

  protected onGoogleError(message: string): void {
    this.infoMessage.set('');
    this.errorMessage.set(message);
  }

  protected submit(): void {
    if (this.connectedQa || this.submitting() || this.continueTo()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.googleLinkRequired.set(false);
    this.verificationSuggested.set(false);
    this.loginDestination = this.currentReturnUrl();
    this.auth.acknowledgeExpiry();
    this.auth.login(this.form.getRawValue()).pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.form.controls.password.reset('');
        if (result.kind === 'authenticated') { this.finish(); return; }
        this.enterSecondFactor(result.challenge);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(error, 'auth'));
        this.verificationSuggested.set(error instanceof ApiError && error.status === 403);
      },
    });
  }

  protected selectMethod(method: TwoFactorMethod): void {
    if (this.submitting() || method === this.method() || !this.challenge()?.methods.includes(method)) return;
    this.method.set(method);
    this.retryCode.set(false);
    this.codeForm.controls.code.reset('');
    this.codeForm.controls.code.updateValueAndValidity();
    this.errorMessage.set('');
    this.infoMessage.set('');
  }

  protected sendEmailCode(): void {
    const challenge = this.challenge();
    if (!challenge?.methods.includes('EMAIL') || this.method() !== 'EMAIL' || this.submitting() || this.resendSeconds() > 0) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.emailDeliveryUncertain.set(false);
    this.auth.sendTwoFactorEmailCode(challenge).pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.emailCodeSent.set(true);
        this.codeForm.controls.code.reset('');
        this.retryCode.set(false);
        this.startCooldown(30);
        this.infoMessage.set('Te enviamos un código de 6 dígitos. Revisa tu correo.');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.emailDeliveryUncertain.set(error instanceof ApiError && (error.kind === 'connection' || error.status >= 500));
        if (error instanceof ApiError && error.status === 429) this.startCooldown(error.retryAfterSeconds ?? 60);
        this.errorMessage.set(describeApiError(error, 'two-factor'));
      },
    });
  }

  protected useReceivedEmailCode(): void {
    if (this.submitting() || !this.emailDeliveryUncertain() || this.method() !== 'EMAIL') return;
    this.emailCodeSent.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('No pudimos confirmar el envío. Si recibiste un código, puedes introducirlo.');
  }

  protected updateDigits(code: string): void {
    if (this.submitting() || code === this.codeForm.controls.code.value) return;
    this.codeForm.controls.code.setValue(code);
    this.errorMessage.set('');
    this.retryCode.set(false);
    if (code.length === 6) this.verify();
  }

  protected maskedEmail(): string {
    const serverMasked = this.challenge()?.maskedEmail?.trim();
    if (serverMasked) return serverMasked;
    const [local, domain] = this.form.controls.email.value.trim().split('@');
    return domain ? `${local[0] ?? ''}•••@${domain}` : 'tu correo';
  }

  protected factorSubtitle(): string {
    if (this.submitting()) return this.method() === 'EMAIL' && !this.emailCodeSent() ? 'Enviando tu código' : 'Verificando tu identidad';
    if (this.method() === 'GOOGLE_AUTHENTICATOR') return 'Ingresa el código de tu app';
    return this.method() === 'EMAIL' && this.emailCodeSent() ? 'Revisa el código que enviamos' : 'Confirma tu identidad';
  }

  private startCooldown(seconds: number): void {
    clearInterval(this.resendTimer);
    const until = Date.now() + seconds * 1000;
    this.resendSeconds.set(seconds);
    this.resendTimer = setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      this.resendSeconds.set(left);
      if (!left) clearInterval(this.resendTimer);
    }, 1000);
  }

  protected verify(): void {
    const challenge = this.challenge();
    if (!challenge?.methods.includes(this.method()) || this.submitting()) return;
    this.codeForm.controls.code.updateValueAndValidity();
    if (this.codeForm.invalid) { this.codeForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.retryCode.set(false);
    this.errorMessage.set('');
    this.auth.completeTwoFactor({
      preAuthChallenge: challenge.preAuthChallenge,
      method: this.method(),
      code: this.codeForm.controls.code.value,
    }).pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.submitting.set(false); this.finish(); },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof ApiError && (error.kind === 'connection' || error.status >= 500)) {
          this.retryCode.set(true);
        } else {
          this.codeForm.controls.code.reset('');
        }
        this.errorMessage.set(describeApiError(error, 'two-factor'));
      },
    });
  }

  protected cancelSecondFactor(): void {
    this.cancelled.next();
    this.submitting.set(false);
    this.challenge.set(null);
    this.codeForm.reset();
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.retryCode.set(false);
    this.emailDeliveryUncertain.set(false);
    clearInterval(this.resendTimer);
    this.resendSeconds.set(0);
    this.step.set('credentials');
  }

  ionViewWillLeave(): void {
    this.cancelSecondFactor();
    this.form.controls.password.reset('');
    this.googleLinkRequired.set(false);
    this.verificationSuggested.set(false);
    this.emailCodeSent.set(false);
    this.continueTo.set(null);
    this.passwordChanged.set(false);
    this.loginDestination = '/main/home';
  }

  ionViewWillEnter(): void {
    this.syncEntryState();
    if (this.step() === 'credentials' && !this.connectedQa && !this.continueTo()) {
      void this.googleButton()?.refreshChallenge();
    }
  }

  private syncEntryState(): void {
    const state = (this.router.currentNavigation()?.extras.state ?? this.location.getState()) as Record<string, unknown> | null;
    const changed = state?.['passwordChanged'] === true;
    const configured = state?.['passwordConfigured'] === true;
    this.passwordChanged.set(changed);
    this.passwordConfigured.set(configured);
    if (changed) {
      this.notifications.success('Contraseña actualizada', 'Inicia sesión con tu nueva contraseña.');
    } else if (configured) {
      this.notifications.success('Contraseña configurada', 'Ya puedes iniciar sesión con tu correo y contraseña o con Google.');
    }
    if (state?.['googleLinkGuided'] === true && this.registrationState.hasActiveLinkIntent()) {
      this.googleLinkRequired.set(true);
    }
    const handoff = this.registrationState.consumeTwoFactorHandoff();
    if (handoff) {
      this.loginDestination = handoff.returnUrl;
      this.enterSecondFactor(handoff.challenge);
    }
  }

  private enterSecondFactor(challenge: TwoFactorChallenge): void {
    this.challenge.set(challenge);
    this.method.set(challenge.methods[0]);
    this.emailCodeSent.set(false);
    this.emailDeliveryUncertain.set(false);
    this.step.set('second-factor');
  }

  protected emailError(): string {
    const control = this.form.controls.email;
    return control.invalid && control.touched ? 'Ingresa un correo válido.' : '';
  }

  protected passwordError(): string {
    const control = this.form.controls.password;
    return control.invalid && control.touched ? 'Ingresa tu contraseña.' : '';
  }

  protected codeError(): string {
    const control = this.codeForm.controls.code;
    if (!control.invalid || !control.touched) return '';
    return this.method() === 'BACKUP_CODE' ? 'Ingresa tu código de respaldo.' : 'Ingresa los 6 dígitos del código.';
  }

  private finish(): void {
    const destination = this.registrationState.hasActiveLinkIntent() ? '/profile/security' : this.loginDestination;
    this.loginDestination = '/main/home';
    this.cancelSecondFactor();
    this.form.controls.password.reset('');
    this.continueTo.set(destination);
    void this.router.navigateByUrl(destination, { replaceUrl: true }).catch(() => false);
  }
}
