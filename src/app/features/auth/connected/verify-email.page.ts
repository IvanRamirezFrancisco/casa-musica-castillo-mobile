import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, mailOutline } from 'ionicons/icons';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { describeApiError } from '../../../core/api/api-error-message';
import { emailActionToken } from '../../../core/validation/email-action-token';
import { AuthService } from '../../../core/services/auth.service';
import { emailValidator, resetTokenValidator } from '../../../core/validation/auth-fields.validation';
import { OtpInputComponent } from '../../../shared/ui/otp-input/otp-input.component';
import { ApiError } from '../../../core/api/api-error';

/** Verificación de cuenta real: `POST /api/auth/verify-email` y reenvío de código. */
@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['../forgot-password/forgot-password.page.scss'],
  styles: ['.auth-alert { margin: 0 0 16px; padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; } .auth-alert--error { background: #fdecea; color: #7a1c14; } .auth-alert--success { background: #e8f5e9; color: #1b4d20; } .step-actions { display: grid; gap: 12px; margin-top: 12px; }'],
  standalone: true,
  imports: [IonContent, IonIcon, ReactiveFormsModule, CmcInputComponent, CmcButtonComponent, OtpInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly verified = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');
  protected readonly digits = signal('');
  protected readonly retryCode = signal(false);
  protected readonly resendSeconds = signal(0);
  private resendTimer: ReturnType<typeof setInterval> | undefined;

  protected readonly form = this.fb.group({ token: ['', [resetTokenValidator]] });
  protected readonly resendForm = this.fb.group({ email: ['', [Validators.required, emailValidator]] });

  constructor() {
    addIcons({ arrowBackOutline, mailOutline });
    this.destroyRef.onDestroy(() => clearInterval(this.resendTimer));
    const email = this.router.currentNavigation()?.extras.state?.['activationEmail'];
    if (typeof email === 'string') this.resendForm.controls.email.setValue(email);
  }

  protected goBackToLogin(): void {
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  protected tokenError(): string {
    const control = this.form.controls.token;
    return control.invalid && control.touched ? 'Pega el enlace de activación completo.' : '';
  }

  protected emailError(): string {
    const control = this.resendForm.controls.email;
    return control.invalid && control.touched ? 'Ingresa un correo válido.' : '';
  }

  protected verify(): void {
    if (this.submitting()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const token = emailActionToken(this.form.controls.token.value, 'verify-account');
    if (token === null) {
      this.form.controls.token.setErrors({ pattern: true });
      this.form.controls.token.markAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.auth.verifyEmail(token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.submitting.set(false); this.verified.set(true); this.form.reset(); },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(error, 'form'));
      },
    });
  }

  protected updateDigits(code: string): void {
    this.digits.set(code);
    this.errorMessage.set('');
    this.retryCode.set(false);
    if (code.length === 6) this.verifyCode();
  }

  protected verifyCode(): void {
    if (this.submitting() || this.digits().length !== 6) return;
    if (this.resendForm.invalid) { this.resendForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.retryCode.set(false);
    this.auth.verifyEmailCode(this.resendForm.controls.email.value, this.digits())
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.submitting.set(false);
          this.digits.set('');
          this.verified.set(true);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          const retry = error instanceof ApiError && (error.kind === 'connection' || error.status >= 500);
          this.retryCode.set(retry);
          if (!retry) this.digits.set('');
          this.errorMessage.set(describeApiError(error, 'form'));
        },
      });
  }

  protected maskedEmail(): string {
    const [local, domain] = this.resendForm.controls.email.value.split('@');
    return domain ? `${local[0] ?? ''}•••@${domain}` : '';
  }

  protected resend(): void {
    if (this.submitting() || this.resendSeconds() > 0) return;
    if (this.resendForm.invalid) { this.resendForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.notice.set('');
    this.auth.resendVerification(this.resendForm.controls.email.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notice.set('Si tu cuenta puede recibir un reenvío, revisa la bandeja de entrada y el correo no deseado.');
        this.digits.set('');
        const deadline = Date.now() + 30_000;
        this.resendSeconds.set(30);
        clearInterval(this.resendTimer);
        this.resendTimer = setInterval(() => {
          const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
          this.resendSeconds.set(remaining);
          if (!remaining) clearInterval(this.resendTimer);
        }, 1000);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(error, 'form'));
      },
    });
  }
}
