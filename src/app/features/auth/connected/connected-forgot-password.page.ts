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
import {
  FIELD_MESSAGES, emailValidator, passwordValidator, passwordsMatch, resetTokenValidator,
} from '../../../core/validation/auth-fields.validation';

/**
 * Recuperación de contraseña real (flujo `/api/auth/password-reset/*`). El servidor responde igual exista
 * o no el correo, por lo que la pantalla nunca confirma la existencia de una cuenta. El correo enviado
 * contiene un enlace web; mientras no existan enlaces de aplicación (App Links) el usuario pega el token.
 */
@Component({
  selector: 'app-connected-forgot-password',
  templateUrl: './connected-forgot-password.page.html',
  styleUrls: ['../forgot-password/forgot-password.page.scss'],
  styles: ['.auth-alert { margin: 0 0 16px; padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; } .auth-alert--error { background: #fdecea; color: #7a1c14; } .auth-alert--success { background: #e8f5e9; color: #1b4d20; } .step-actions { display: grid; gap: 12px; margin-top: 12px; }'],
  host: { class: 'ion-page' },
  standalone: true,
  imports: [IonContent, IonIcon, ReactiveFormsModule, CmcInputComponent, CmcButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedForgotPasswordPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly step = signal<'request' | 'confirm' | 'done'>('request');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly requestForm = this.fb.group({ email: ['', [Validators.required, emailValidator]] });
  protected readonly confirmForm = this.fb.group({
    token: ['', [resetTokenValidator]],
    password: ['', [passwordValidator]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  constructor() { addIcons({ arrowBackOutline, mailOutline }); }

  protected goBackToLogin(): void {
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  protected emailError(): string {
    const control = this.requestForm.controls.email;
    return control.invalid && control.touched ? 'Ingresa un correo válido.' : '';
  }

  protected tokenError(): string {
    const control = this.confirmForm.controls.token;
    return control.invalid && control.touched ? 'Pega el código completo, sin espacios.' : '';
  }

  protected passwordError(): string {
    const control = this.confirmForm.controls.password;
    if (!control.touched || control.valid) return '';
    return FIELD_MESSAGES[Object.keys(control.errors ?? {})[0]] ?? 'La contraseña no es válida.';
  }

  protected confirmError(): string {
    const control = this.confirmForm.controls.confirmPassword;
    if (!control.touched) return '';
    return this.confirmForm.hasError('passwordMismatch') || control.invalid ? 'Las contraseñas no coinciden.' : '';
  }

  protected request(): void {
    if (this.submitting()) return;
    if (this.requestForm.invalid) { this.requestForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.auth.requestPasswordReset(this.requestForm.controls.email.value).subscribe({
      next: () => { this.submitting.set(false); this.step.set('confirm'); },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(error, 'form'));
      },
    });
  }

  protected confirm(): void {
    if (this.submitting()) return;
    if (this.confirmForm.invalid) { this.confirmForm.markAllAsTouched(); return; }
    const value = this.confirmForm.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set('');
    this.auth.confirmPasswordReset(value.token, value.password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.confirmForm.reset();
        this.step.set('done');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.confirmForm.controls.password.reset('');
        this.confirmForm.controls.confirmPassword.reset('');
        this.errorMessage.set(describeApiError(error, 'form'));
      },
    });
  }
}
