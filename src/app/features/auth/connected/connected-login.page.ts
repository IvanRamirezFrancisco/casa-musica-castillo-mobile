import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { musicalNotesOutline } from 'ionicons/icons';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { describeApiError } from '../../../core/api/api-error-message';
import { ApiError } from '../../../core/api/api-error';
import type { TwoFactorChallenge, TwoFactorMethod } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { safeReturnUrl } from '../../../core/security/auth.guard';
import { emailValidator, otpValidator } from '../../../core/validation/auth-fields.validation';

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
  styleUrls: ['../login/login.page.scss'],
  styles: ['.auth-alert { margin: 0 0 16px; padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; } .auth-alert--error { background: #fdecea; color: #7a1c14; } .auth-alert--info { background: #fff6e0; color: #5c4300; } .method-group { border: 0; padding: 0; margin: 0 0 16px; display: grid; gap: 8px; } .method-option { display: flex; align-items: center; gap: 12px; min-height: 48px; } .method-option input { width: 24px; height: 24px; accent-color: var(--cmc-primary); } .step-actions { display: grid; gap: 12px; margin-top: 12px; }'],
  host: { class: 'ion-page' },
  standalone: true,
  imports: [IonContent, IonIcon, ReactiveFormsModule, RouterLink, CmcInputComponent, CmcButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedLoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);

  protected readonly methodLabels = METHOD_LABELS;
  protected readonly step = signal<'credentials' | 'second-factor'>('credentials');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly verificationSuggested = signal(false);
  protected readonly infoMessage = signal('');
  protected readonly challenge = signal<TwoFactorChallenge | null>(null);
  protected readonly method = signal<TwoFactorMethod>('EMAIL');
  protected readonly emailCodeSent = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, emailValidator]],
    password: ['', [Validators.required, Validators.maxLength(255)]],
  });
  protected readonly codeForm = this.fb.group({
    code: ['', [otpValidator(() => this.method())]],
  });

  constructor() { addIcons({ musicalNotesOutline }); }

  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.verificationSuggested.set(false);
    this.auth.acknowledgeExpiry();
    this.auth.login(this.form.getRawValue()).subscribe({
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
    this.method.set(method);
    this.codeForm.controls.code.reset('');
    this.errorMessage.set('');
    this.infoMessage.set('');
  }

  protected sendEmailCode(): void {
    const challenge = this.challenge();
    if (!challenge || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    this.auth.sendTwoFactorEmailCode(challenge).subscribe({
      next: () => {
        this.submitting.set(false);
        this.emailCodeSent.set(true);
        this.infoMessage.set('Te enviamos un código de 6 dígitos. Revisa tu correo.');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(error, 'two-factor'));
      },
    });
  }

  protected verify(): void {
    const challenge = this.challenge();
    if (!challenge || this.submitting()) return;
    this.codeForm.controls.code.updateValueAndValidity();
    if (this.codeForm.invalid) { this.codeForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.auth.completeTwoFactor({
      preAuthChallenge: challenge.preAuthChallenge,
      method: this.method(),
      code: this.codeForm.controls.code.value,
    }).subscribe({
      next: () => { this.submitting.set(false); this.finish(); },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.codeForm.controls.code.reset('');
        this.errorMessage.set(describeApiError(error, 'two-factor'));
      },
    });
  }

  protected cancelSecondFactor(): void {
    this.challenge.set(null);
    this.codeForm.reset();
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.step.set('credentials');
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
    void this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')), { replaceUrl: true });
  }
}
