import { Subject, takeUntil } from 'rxjs';
import { VerifyEmailPage } from './verify-email.page';
import { ApiError } from '../../../core/api/api-error';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcIconComponent } from '../../../shared/ui/icon/cmc-icon.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { describeApiError } from '../../../core/api/api-error-message';
import { safeReturnUrl } from '../../../core/security/auth.guard';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleRegistrationStateService } from '../../../core/services/google-registration-state.service';
import { ApiClientService } from '../../../core/api/api-client.service';
import { GoogleSigninButtonComponent } from '../../../shared/ui/google-signin-button/google-signin-button.component';
import { CmcBrandLogoDirective } from '../../../shared/ui/branding/cmc-brand-logo.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FIELD_LIMITS, FIELD_MESSAGES, emailValidator, optionalPhoneValidator, passwordByteLength, passwordCharacterTypes, passwordValidator,
  passwordsMatch, personNameValidator, usernameValidator,
} from '../../../core/validation/auth-fields.validation';

/**
 * Registro real con los campos separados de `RegisterRequest`. No inicia sesión: el backend exige
 * verificar el correo antes de permitir el acceso. Las contraseñas se borran del formulario al terminar.
 */
@Component({
  selector: 'app-connected-register',
  templateUrl: './connected-register.page.html',
  styleUrls: ['../register/register.page.scss', './connected-register.page.scss'],
  styles: ['.auth-alert { margin: 0 0 16px; padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; } .auth-alert--error { background: #fdecea; color: #7a1c14; } .auth-alert--success { background: #e8f5e9; color: #1b4d20; } .step-actions { display: grid; gap: 12px; margin-top: 12px; }'],
  host: { class: 'ion-page' },
  standalone: true,
  imports: [IonContent, IonIcon, RouterLink, ReactiveFormsModule, CmcBrandLogoDirective, CmcInputComponent, CmcButtonComponent, CmcIconComponent, VerifyEmailPage, GoogleSigninButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedRegisterPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly registrationState = inject(GoogleRegistrationStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelled = new Subject<void>();
  private readonly content = viewChild<IonContent, ElementRef<HTMLIonContentElement>>('registrationContent', {read: ElementRef});
  private readonly googleButton = viewChild(GoogleSigninButtonComponent);
  protected readonly registrationUncertain = signal(false);
  protected readonly submittedEmail = signal('');
  protected readonly registerStep = signal<'choose' | 'form'>('choose');

  protected authReturnParams(): { returnUrl?: string } {
    const destination = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), '');
    return destination ? { returnUrl: destination } : {};
  }

  protected readonly passwordFocused = signal(false);
  protected readonly submitting = signal(false);
  protected readonly registered = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly googleLinkRequired = signal(false);
  protected readonly infoMessage = signal('');
  protected readonly limits = FIELD_LIMITS;
  protected readonly phoneDigits = 10;
  protected readonly legal = signal<{ required: boolean; termsVersion: string; privacyVersion: string } | null>(null);
  protected readonly termsAccepted = signal(false);
  protected readonly privacyRead = signal(false);

  protected readonly form = this.fb.group({
    username: ['', [usernameValidator]],
    firstName: ['', [personNameValidator]],
    lastName: ['', [personNameValidator]],
    email: ['', [emailValidator]],
    phone: ['', [optionalPhoneValidator]],
    password: ['', [passwordValidator]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  constructor() {
    addIcons({ arrowBackOutline });
    this.form.controls.email.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.cancelled.next();this.submitting.set(false);this.errorMessage.set('');
    });
    inject(ApiClientService).get<{ required: boolean; termsVersion: string; privacyVersion: string }>('/api/public/legal/registration')
      .pipe(takeUntilDestroyed()).subscribe({
        next: documents => {
          if (documents?.required === true && typeof documents.termsVersion === 'string' &&
              typeof documents.privacyVersion === 'string') this.legal.set(documents);
        },
        error: () => undefined,
      });
  }

  ionViewWillEnter(): void {
    if (!this.registered()) {
      void this.googleButton()?.refreshChallenge();
    }
  }

  ionViewWillLeave():void {
    this.cancelled.next();this.form.reset();this.submitting.set(false);this.registered.set(false);
    this.registrationUncertain.set(false);this.submittedEmail.set('');
    this.registerStep.set('choose');
    this.googleLinkRequired.set(false);
    this.termsAccepted.set(false);this.privacyRead.set(false);
  }

  protected openEmailForm(): void {
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.registerStep.set('form');
    this.scrollToActivation();
  }

  protected backToMethodChoice(): void {
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.registerStep.set('choose');
    this.scrollToActivation();
  }

  protected handleBackButton(): void {
    if (!this.registered() && !this.registrationUncertain() && this.registerStep() === 'form') {
      this.backToMethodChoice();
      return;
    }
    this.goBack();
  }

  protected preferGoogleFromForm(): void {
    this.backToMethodChoice();
    const btn = this.googleButton();
    if (btn) {
      void btn.triggerNativeSignIn();
    }
  }

  protected checked(event: Event): boolean { return (event.target as HTMLInputElement).checked; }

  protected fieldError(name: 'username' | 'firstName' | 'lastName' | 'email' | 'phone' | 'password'): string {
    const control = this.form.controls[name];
    if (!control.touched || control.valid) return '';
    const key = Object.keys(control.errors ?? {})[0];
    if (name === 'password' && control.value) {
      if (key === 'whitespace' || key === 'simplePassword') return FIELD_MESSAGES[key];
      if (key === 'maxbytes' || key === 'maxlength') return 'Usa una contraseña más corta.';
      return this.passwordChecklist().feedback === 'warning'
        ? 'Estás a un paso de cumplir los requisitos.'
        : 'Faltan requisitos de contraseña.';
    }
    if (name === 'email' && key === 'pattern') return 'Ingresa un correo válido.';
    if (name === 'phone') return 'Ingresa 10 dígitos, sin lada internacional, o deja el campo vacío.';
    if (name === 'username' && key === 'pattern') return 'Usa solo letras, números, punto, guion y guion bajo.';
    return FIELD_MESSAGES[key] ?? 'El valor no es válido.';
  }

  protected passwordChecklist() {
    const value = this.form.controls.password.value;
    const length = value.length >= FIELD_LIMITS.passwordMin && value.length <= FIELD_LIMITS.passwordMax;
    const tooLong = value.length > FIELD_LIMITS.passwordMax || passwordByteLength(value) > FIELD_LIMITS.passwordMaxBytes;
    const variety = passwordCharacterTypes(value) === 4;
    const valid = this.form.controls.password.valid;
    const feedback = valid ? 'positive' : !tooLong && (length || variety) ? 'warning' : 'negative';
    const strength = valid ? 'Fuerte' : feedback === 'warning' ? 'Media' : 'Débil';
    const level = valid ? 3 : feedback === 'warning' ? 2 : value ? 1 : 0;

    return { length, variety, tooLong, feedback, strength, level } as const;
  }

  protected phoneConfirmed(): boolean {
    const phone = this.form.controls.phone;
    return phone.valid && phone.value.trim().length > 0;
  }

  protected confirmError(): string {
    const control = this.form.controls.confirmPassword;
    if (!control.touched) return '';
    if (!control.value) return 'Repite tu contraseña para continuar.';
    return this.form.hasError('passwordMismatch') ? 'Las contraseñas no coinciden.' : '';
  }

  protected confirmationStatus(): string {
    return this.passwordsCoincide() ? 'Las contraseñas coinciden.' : '';
  }

  protected passwordsCoincide(): boolean {
    return !!this.form.controls.confirmPassword.value && !this.form.hasError('passwordMismatch');
  }

  protected onGoogleCredential(event: { idToken: string; nonce: string }): void {
    if (this.submitting() || this.registered()) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.googleLinkRequired.set(false);
    this.registrationState.clearLinkIntent();
    const destination = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), '/main/home');
    this.auth.authenticateWithGoogle(event.idToken, event.nonce)
      .pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          if (result.kind === 'authenticated') {
            void this.router.navigateByUrl(destination, { replaceUrl: true });
            return;
          }
          if (result.kind === 'registration-required') {
            this.registrationState.set(result.pending, destination, 'register');
            void this.router.navigateByUrl('/complete-account');
            return;
          }
          this.registrationState.setTwoFactorHandoff(result.challenge, destination);
          void this.router.navigate(['/login'], { queryParams: this.authReturnParams() });
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          if (error instanceof ApiError && error.status === 409) {
            this.googleLinkRequired.set(true);
            this.errorMessage.set('');
            return;
          }
          this.errorMessage.set(describeApiError(error, 'auth'));
        },
      });
  }

  protected goToLoginForGoogleLink(): void {
    this.registrationState.setLinkIntent();
    this.googleLinkRequired.set(false);
    void this.router.navigate(['/login'], {
      queryParams: this.authReturnParams(),
      state: { googleLinkGuided: true },
    });
  }

  protected onGoogleCancelled(): void {
    this.errorMessage.set('');
    this.infoMessage.set('Registro con Google cancelado. Puedes intentar nuevamente o usar el formulario tradicional.');
  }

  protected onGoogleError(message: string): void {
    this.infoMessage.set('');
    this.errorMessage.set(message);
  }

  protected goBack(): void {
    void this.router.navigate(['/login'], { replaceUrl: true, queryParams: this.authReturnParams() });
  }

  protected submit(): void {
    if (this.submitting() || this.registered()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const legal = this.legal();
    if (legal?.required && (!this.termsAccepted() || !this.privacyRead())) {
      this.errorMessage.set('Confirma por separado los términos y la lectura del aviso de privacidad.');
      return;
    }
    this.submitting.set(true);
    this.submittedEmail.set(value.email.trim());
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.auth.register({
      username: value.username, firstName: value.firstName, lastName: value.lastName,
      email: value.email, password: value.password, phone: value.phone,
      ...(legal?.required ? { legalAcceptance: {
        termsAccepted: this.termsAccepted(), privacyRead: this.privacyRead(),
        termsVersion: legal.termsVersion, privacyVersion: legal.privacyVersion,
      } } : {}),
    }).pipe(takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.registered.set(true);
        this.form.controls.password.reset('');
        this.form.controls.confirmPassword.reset('');
        this.scrollToActivation();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof ApiError && (error.kind === 'connection' || error.kind === 'invalid-response' || error.status >= 500)) {
          this.registrationUncertain.set(true);
          this.form.controls.password.reset('');this.form.controls.confirmPassword.reset('');
          this.scrollToActivation();
        } else this.errorMessage.set(describeApiError(error, 'form'));
      },
    });
  }

  private scrollToActivation():void {
    const content=this.content()?.nativeElement;
    if (typeof content?.scrollToTop==='function') void content.scrollToTop(0);
  }
}
