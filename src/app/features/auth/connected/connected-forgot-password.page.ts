import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmarkOutline, mailOutline } from 'ionicons/icons';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { CmcBrandLogoDirective } from '../../../shared/ui/branding/cmc-brand-logo.directive';
import { ApiError } from '../../../core/api/api-error';
import { describeApiError } from '../../../core/api/api-error-message';
import { emailActionToken } from '../../../core/validation/email-action-token';
import { AuthService } from '../../../core/services/auth.service';
import {
  FIELD_MESSAGES, emailValidator, passwordValidator, passwordsMatch, resetTokenValidator,
} from '../../../core/validation/auth-fields.validation';

/**
 * Recuperación de contraseña real (flujo `/api/auth/password-reset/*`). El servidor responde igual exista
 * o no el correo, por lo que la pantalla nunca confirma la existencia de una cuenta. El correo enviado
 * contiene un enlace web; su ruta conectada captura el token sin mostrarlo como campo editable.
 */
@Component({
  selector: 'app-connected-forgot-password',
  templateUrl: './connected-forgot-password.page.html',
  styleUrls: ['../forgot-password/forgot-password.page.scss', './connected-forgot-password.page.scss'],
  styles: ['.auth-alert { margin: 0 0 16px; padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; } .auth-alert--error { background: #fdecea; color: #7a1c14; } .auth-alert--success { background: #e8f5e9; color: #1b4d20; } .step-actions { display: grid; gap: 12px; margin-top: 12px; }'],
  host: { class: 'ion-page' },
  standalone: true,
  imports: [IonContent, IonIcon, ReactiveFormsModule, CmcBrandLogoDirective, CmcInputComponent, CmcButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedForgotPasswordPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelled = new Subject<void>();
  protected readonly resendSeconds = signal(0);
  private resendTimer: ReturnType<typeof setInterval> | undefined;
  private successTimer: ReturnType<typeof setInterval> | undefined;
  private loginNavigationStarted = false;
  protected readonly redirectSeconds = signal(6);
  private readonly successTitle = viewChild<ElementRef<HTMLElement>>('successTitle');

  protected readonly step = signal<'request' | 'sent' | 'confirm' | 'done'>('request');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly requestForm = this.fb.group({ email: ['', [Validators.required, emailValidator]] });
  protected readonly confirmForm = this.fb.group({
    token: ['', [resetTokenValidator]],
    password: ['', [passwordValidator]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  constructor() {
    addIcons({ arrowBackOutline, checkmarkOutline, mailOutline });
    afterRenderEffect(() => {
      if (this.step() === 'done') this.successTitle()?.nativeElement.focus({ preventScroll: true });
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      if (!params.has('token')) return;
      this.stopSuccessTimer(); this.loginNavigationStarted = false;
      this.cancelled.next(); this.submitting.set(false); this.confirmForm.reset();
      const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams: { token: null }, queryParamsHandling: 'merge' });
      delete tree.queryParams['token'];
      this.location.replaceState(this.router.serializeUrl(tree));
      const token = params.getAll('token').length === 1 ? emailActionToken(params.get('token') ?? '', 'reset-password') : null;
      if (token === null) {
        this.errorMessage.set('El enlace no es válido. Solicita nuevas instrucciones.');this.step.set('request');return;
      }
      this.confirmForm.controls.token.setValue(token);this.errorMessage.set('');this.step.set('confirm');
    });
    this.destroyRef.onDestroy(() => this.clearSensitiveState());
  }
  ionViewWillLeave(): void { this.clearSensitiveState(); }
  ionViewWillEnter(): void { this.loginNavigationStarted = false; }
  private clearSensitiveState(): void {
    this.stopSuccessTimer();
    this.cancelled.next();clearInterval(this.resendTimer);this.resendSeconds.set(0);
    this.submitting.set(false);this.confirmForm.reset();this.requestForm.reset();
    this.errorMessage.set('');this.step.set('request');
  }
  private cooldown(seconds = 60): void {
    clearInterval(this.resendTimer);const deadline = Date.now() + seconds * 1000;
    const tick = () => { const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); this.resendSeconds.set(left); if (!left) clearInterval(this.resendTimer); };
    tick();this.resendTimer = setInterval(tick, 1000);
  }

  protected goBackToLogin(): void {
    this.stopSuccessTimer();
    if (this.loginNavigationStarted) return;
    this.loginNavigationStarted = true;
    void this.router.navigate(['/login'], { replaceUrl: true }).then(
      navigated => { if (!navigated) this.loginNavigationStarted = false; },
      () => { this.loginNavigationStarted = false; },
    );
  }
  private stopSuccessTimer(): void {
    clearInterval(this.successTimer); this.successTimer = undefined;
  }
  private showConfirmedSuccess(): void {
    this.stopSuccessTimer(); clearInterval(this.resendTimer);
    this.confirmForm.reset(); this.requestForm.reset(); this.errorMessage.set('');
    this.redirectSeconds.set(6); this.step.set('done');
    const deadline = Date.now() + 6000;
    this.successTimer = setInterval(() => {
      if (this.step() !== 'done' || this.loginNavigationStarted) { this.stopSuccessTimer(); return; }
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      this.redirectSeconds.set(seconds);
      if (!seconds) this.goBackToLogin();
    }, 1000);
  }

  protected emailError(): string {
    const control = this.requestForm.controls.email;
    if (!control.touched || control.valid) return '';
    if (control.hasError('required')) return 'Ingresa tu correo electrónico.';
    return control.hasError('maxlength') ? 'El correo admite como máximo 100 caracteres.' : 'Ingresa un correo válido, por ejemplo nombre@correo.com.';
  }

  protected tokenError(): string {
    const control = this.confirmForm.controls.token;
    return control.invalid && control.touched ? 'El enlace no es válido. Solicita nuevas instrucciones.' : '';
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
    if (this.submitting() || this.resendSeconds() > 0) return;
    if (this.requestForm.invalid) { this.requestForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.auth.requestPasswordReset(this.requestForm.controls.email.value).pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.submitting.set(false); this.step.set('sent'); this.cooldown(); },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof ApiError && error.status === 429) this.cooldown(error.retryAfterSeconds ?? 60);
        this.errorMessage.set(describeApiError(error, 'form'));
      },
    });
  }

  protected useAnotherEmail(): void {
    if (this.submitting()) return;
    this.stopSuccessTimer();
    clearInterval(this.resendTimer);this.resendSeconds.set(0);
    this.requestForm.reset();
    this.confirmForm.reset();
    this.errorMessage.set('');
    this.step.set('request');
  }

  protected confirm(): void {
    if (this.submitting() || this.step() === 'done') return;
    if (this.confirmForm.invalid) { this.confirmForm.markAllAsTouched(); return; }
    const value = this.confirmForm.getRawValue();
    const token = emailActionToken(this.confirmForm.controls.token.value, 'reset-password');
    if (token === null) {
      this.confirmForm.controls.token.setErrors({ pattern: true });
      this.confirmForm.controls.token.markAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.auth.confirmPasswordReset(token, value.password).pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showConfirmedSuccess();
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
