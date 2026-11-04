import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { describeApiError } from '../../../core/api/api-error-message';
import { AuthService } from '../../../core/services/auth.service';
import {
  FIELD_LIMITS, FIELD_MESSAGES, emailValidator, optionalPhoneValidator, passwordValidator,
  passwordsMatch, personNameValidator, usernameValidator,
} from '../../../core/validation/auth-fields.validation';

/**
 * Registro real con los campos separados de `RegisterRequest`. No inicia sesión: el backend exige
 * verificar el correo antes de permitir el acceso. Las contraseñas se borran del formulario al terminar.
 */
@Component({
  selector: 'app-connected-register',
  templateUrl: './connected-register.page.html',
  styleUrls: ['../register/register.page.scss'],
  styles: ['.auth-alert { margin: 0 0 16px; padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; } .auth-alert--error { background: #fdecea; color: #7a1c14; } .auth-alert--success { background: #e8f5e9; color: #1b4d20; } .step-actions { display: grid; gap: 12px; margin-top: 12px; }'],
  host: { class: 'ion-page' },
  standalone: true,
  imports: [IonContent, IonIcon, RouterLink, ReactiveFormsModule, CmcInputComponent, CmcButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedRegisterPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly submitting = signal(false);
  protected readonly registered = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly limits = FIELD_LIMITS;

  protected readonly form = this.fb.group({
    username: ['', [usernameValidator]],
    firstName: ['', [personNameValidator]],
    lastName: ['', [personNameValidator]],
    email: ['', [emailValidator]],
    phone: ['', [optionalPhoneValidator]],
    password: ['', [passwordValidator]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  constructor() { addIcons({ arrowBackOutline }); }

  protected fieldError(name: 'username' | 'firstName' | 'lastName' | 'email' | 'phone' | 'password'): string {
    const control = this.form.controls[name];
    if (!control.touched || control.valid) return '';
    const key = Object.keys(control.errors ?? {})[0];
    if (name === 'password' && key === 'minlength') return `Usa al menos ${FIELD_LIMITS.passwordMin} caracteres.`;
    if (name === 'email' && key === 'pattern') return 'Ingresa un correo válido.';
    if (name === 'phone') return 'Ingresa 10 dígitos o deja el campo vacío.';
    if (name === 'username' && key === 'pattern') return 'Usa solo letras, números, punto, guion y guion bajo.';
    return FIELD_MESSAGES[key] ?? 'El valor no es válido.';
  }

  protected confirmError(): string {
    const control = this.form.controls.confirmPassword;
    if (!control.touched) return '';
    return this.form.hasError('passwordMismatch') || control.invalid ? 'Las contraseñas no coinciden.' : '';
  }

  protected goBack(): void {
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  protected submit(): void {
    if (this.submitting() || this.registered()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set('');
    this.auth.register({
      username: value.username, firstName: value.firstName, lastName: value.lastName,
      email: value.email, password: value.password, phone: value.phone,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.registered.set(true);
        this.form.controls.password.reset('');
        this.form.controls.confirmPassword.reset('');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(error, 'form'));
      },
    });
  }
}
