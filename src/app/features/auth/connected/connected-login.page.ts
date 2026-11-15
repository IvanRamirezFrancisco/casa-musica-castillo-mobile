import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, musicalNotesOutline } from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { CmcIconComponent } from '../../../shared/ui/icon/cmc-icon.component';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { describeApiError } from '../../../core/api/api-error-message';
import { ApiError } from '../../../core/api/api-error';
import type { TwoFactorChallenge, TwoFactorMethod } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { CONNECTED_QA } from '../../../core/config/connected-qa.token';
import { safeReturnUrl } from '../../../core/security/auth.guard';
import { emailValidator, otpValidator } from '../../../core/validation/auth-fields.validation';
import { OtpInputComponent } from '../../../shared/ui/otp-input/otp-input.component';

const METHOD_LABELS: Record<TwoFactorMethod, string> = {
  EMAIL: 'Código enviado por correo',
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
  imports: [IonContent, IonIcon, ReactiveFormsModule, RouterLink, CmcIconComponent, CmcInputComponent, CmcButtonComponent, OtpInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedLoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly connectedQa = inject(CONNECTED_QA);
  private readonly cancelled = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);

  protected readonly methodLabels = METHOD_LABELS;
  protected readonly step = signal<'credentials' | 'second-factor'>('credentials');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly verificationSuggested = signal(false);
  protected readonly infoMessage = signal('');
  protected readonly passwordChanged = signal(false);
  protected readonly continueTo = signal<string | null>(null);
  protected readonly challenge = signal<TwoFactorChallenge | null>(null);
  protected readonly method = signal<TwoFactorMethod>('EMAIL');
  protected readonly emailCodeSent = signal(false);
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

  constructor() {
    addIcons({ arrowBackOutline, musicalNotesOutline });
    afterRenderEffect(() => this.factorTitle()?.nativeElement.focus());
    this.destroyRef.onDestroy(() => clearInterval(this.resendTimer));
  }

  protected submit(): void {
    if (this.connectedQa || this.submitting() || this.continueTo()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.verificationSuggested.set(false);
    this.auth.acknowledgeExpiry();
    this.auth.login(this.form.getRawValue()).pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.form.controls.password.reset('');
        if (result.kind === 'authenticated') { this.finish(); return; }
        this.challenge.set(result.challenge);
        this.method.set(result.challenge.methods[0]);
        this.emailCodeSent.set(false);
        this.step.set('second-factor');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(error, 'auth'));
        this.verificationSuggested.set(error instanceof ApiError && error.status === 403);
      },
    });
  }

  protected selectMethod(method: TwoFactorMethod): void {
    if (this.submitting()) return;
    this.method.set(method);
    this.retryCode.set(false);
    this.codeForm.controls.code.reset('');
    this.errorMessage.set('');
    this.infoMessage.set('');
  }

  protected sendEmailCode(): void {
    const challenge = this.challenge();
    if (!challenge || this.submitting() || this.resendSeconds() > 0) return;
    this.submitting.set(true);
    this.errorMessage.set('');
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
        if (error instanceof ApiError && error.status === 429) this.startCooldown(error.retryAfterSeconds ?? 60);
        this.errorMessage.set(describeApiError(error, 'two-factor'));
      },
    });
  }

  protected updateDigits(code: string): void {
    if (this.submitting() || code === this.codeForm.controls.code.value) return;
    this.codeForm.controls.code.setValue(code);
    this.errorMessage.set('');
    this.retryCode.set(false);
    if (code.length === 6) this.verify();
  }

  protected maskedEmail(): string {
    const [local, domain] = this.form.controls.email.value.trim().split('@');
    return domain ? `${local[0] ?? ''}•••@${domain}` : 'tu correo';
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
    if (!challenge || this.submitting()) return;
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
    clearInterval(this.resendTimer);
    this.resendSeconds.set(0);
    this.step.set('credentials');
  }

  ionViewWillLeave(): void {
    this.cancelSecondFactor();
    this.form.controls.password.reset('');
    this.verificationSuggested.set(false);
    this.emailCodeSent.set(false);
    this.continueTo.set(null);
    this.passwordChanged.set(false);
  }

  ionViewWillEnter(): void {
    this.passwordChanged.set(this.router.currentNavigation()?.extras.state?.['passwordChanged'] === true);
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
    const destination = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
    this.cancelSecondFactor();
    this.form.controls.password.reset('');
    this.continueTo.set(destination);
    void this.router.navigateByUrl(destination, { replaceUrl: true }).catch(() => false);
  }
}
