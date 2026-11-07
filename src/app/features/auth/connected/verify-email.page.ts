import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, mailOutline } from 'ionicons/icons';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { describeApiError } from '../../../core/api/api-error-message';
import { AuthService } from '../../../core/services/auth.service';
import { emailValidator, resetTokenValidator } from '../../../core/validation/auth-fields.validation';

/** Verificación de cuenta real: `POST /api/auth/verify-email` y reenvío de código. */
@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['../forgot-password/forgot-password.page.scss'],
  styles: ['.auth-alert { margin: 0 0 16px; padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; } .auth-alert--error { background: #fdecea; color: #7a1c14; } .auth-alert--success { background: #e8f5e9; color: #1b4d20; } .step-actions { display: grid; gap: 12px; margin-top: 12px; }'],
  standalone: true,
  imports: [IonContent, IonIcon, ReactiveFormsModule, CmcInputComponent, CmcButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly submitting = signal(false);
  protected readonly verified = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');
  protected readonly showResend = signal(false);

  protected readonly form = this.fb.group({ token: ['', [resetTokenValidator]] });
  protected readonly resendForm = this.fb.group({ email: ['', [Validators.required, emailValidator]] });

  constructor() { addIcons({ arrowBackOutline, mailOutline }); }

  protected goBackToLogin(): void {
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  protected tokenError(): string {
    const control = this.form.controls.token;
    return control.invalid && control.touched ? 'Pega el código completo, sin espacios.' : '';
  }

  protected emailError(): string {
    const control = this.resendForm.controls.email;
    return control.invalid && control.touched ? 'Ingresa un correo válido.' : '';
  }

  protected verify(): void {
    if (this.submitting()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.auth.verifyEmail(this.form.controls.token.value).subscribe({
      next: () => { this.submitting.set(false); this.verified.set(true); this.form.reset(); },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(error, 'form'));
      },
    });
  }

  protected resend(): void {
    if (this.submitting()) return;
    if (this.resendForm.invalid) { this.resendForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.notice.set('');
    this.auth.resendVerification(this.resendForm.controls.email.value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notice.set('Si la cuenta existe y no está verificada, enviamos un nuevo código.');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(error, 'form'));
      },
    });
  }
}
