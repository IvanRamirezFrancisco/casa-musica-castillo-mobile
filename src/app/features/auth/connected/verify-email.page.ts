import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Location, NgTemplateOutlet } from '@angular/common';
import { Observable, Subject, takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmarkCircleOutline, mailOutline } from 'ionicons/icons';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { describeApiError } from '../../../core/api/api-error-message';
import { emailActionToken } from '../../../core/validation/email-action-token';
import { AuthService } from '../../../core/services/auth.service';
import { emailValidator, resetTokenValidator } from '../../../core/validation/auth-fields.validation';
import { OtpInputComponent } from '../../../shared/ui/otp-input/otp-input.component';
import { CmcBrandLogoDirective } from '../../../shared/ui/branding/cmc-brand-logo.directive';
import { ApiError } from '../../../core/api/api-error';

type ActivationPhase = 'initial' | 'requesting' | 'instructions' | 'entering-code' | 'verifying-code' | 'verifying-link'
  | 'recoverable-network-error' | 'rate-limited' | 'expired' | 'verified';

/** Verificación de cuenta real: `POST /api/auth/verify-email` y reenvío de código. */
@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['../forgot-password/forgot-password.page.scss'],
  styles: ['.auth-alert { margin: 0 0 16px; padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; } .auth-alert--error { background: #fdecea; color: #7a1c14; } .auth-alert--info { background: var(--cmc-promo-surface); color: var(--cmc-text-primary); } .step-actions { display: grid; gap: 12px; margin-top: 12px; }'],
  standalone: true,
  imports: [NgTemplateOutlet, IonContent, IonIcon, ReactiveFormsModule, CmcBrandLogoDirective, CmcInputComponent, CmcButtonComponent, OtpInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage implements OnInit {
  readonly embedded = input(false);
  readonly activationEmail = input('');
  readonly ambiguousRequest = input(false);
  readonly login = output<void>();
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelled = new Subject<void>();
  // Mirrors the current server cooldown (30s); the server remains authoritative.
  private readonly cooldownSeconds = 30;
  private readonly deadlines = new Map<string, number>();
  private verificationTimer: ReturnType<typeof setInterval> | undefined;
  protected readonly verificationSeconds = signal(0);
  private resendTimer: ReturnType<typeof setInterval> | undefined;
  private retryLink = '';

  protected readonly phase = signal<ActivationPhase>('initial');
  protected readonly submitting = computed(() => ['requesting', 'verifying-code', 'verifying-link'].includes(this.phase()));
  protected readonly verified = computed(() => this.phase() === 'verified');
  protected readonly codeEntry = signal(false);
  protected readonly editingEmail = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');
  protected readonly digits = signal('');
  protected readonly retryCode = signal(false);
  protected readonly retryingLink = signal(false);
  protected readonly codeInvalid = signal(false);
  protected readonly resendSeconds = signal(0);
  protected readonly form = this.fb.group({ token: ['', [resetTokenValidator]] });
  protected readonly resendForm = this.fb.group({ email: ['', [Validators.required, emailValidator]] });

  constructor() {
    addIcons({ arrowBackOutline, checkmarkCircleOutline, mailOutline });
    this.destroyRef.onDestroy(() => this.clearTransient());
    this.resendForm.controls.email.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.cancelled.next();this.phase.set('initial');this.codeEntry.set(false);this.digits.set('');
      this.errorMessage.set('');this.notice.set('');this.codeInvalid.set(false);this.retryCode.set(false);
      this.retryLink='';this.retryingLink.set(false);this.form.reset();
      this.refreshCountdown();
    });
    effect(() => {
      const embedded=this.embedded(), email=this.activationEmail(), uncertain=this.ambiguousRequest();
      if (!embedded || !email) return;
      untracked(() => {
        this.resendForm.controls.email.setValue(email.trim(), {emitEvent: false});
        this.codeEntry.set(true);this.phase.set(uncertain ? 'recoverable-network-error' : 'entering-code');
        this.notice.set(uncertain ? 'No pudimos confirmar la solicitud. Si recibiste un código, puedes ingresarlo aquí.' : '');
        this.startCooldown(this.cooldownSeconds);
      });
    });
  }

  ngOnInit(): void {
    if (this.embedded()) return;
    const email = this.router.currentNavigation()?.extras.state?.['activationEmail'];
    if (typeof email === 'string') this.resendForm.controls.email.setValue(email);
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (!params.has('token')) return;
      this.cancelled.next();this.phase.set('initial');this.retryLink='';
      this.digits.set('');this.form.reset();this.errorMessage.set('');this.notice.set('');
      const tokens = params.getAll('token');
      const token = tokens.length === 1 ? emailActionToken(tokens[0], 'verify-account') : null;
      // Remove the visible token without navigating or launching another verification.
      const incoming = this.router.currentNavigation()?.finalUrl;
      const tree = this.router.parseUrl(incoming ? this.router.serializeUrl(incoming) : this.router.url);
      delete tree.queryParams['token'];
      this.location.replaceState(this.router.serializeUrl(tree));
      if (!token) {this.phase.set('expired');this.errorMessage.set('El enlace de activación no es válido.');return;}
      this.verifyLink(token);
    });
  }

  ionViewWillLeave(): void { this.clearTransient(); }
  clearTransient(): void {
    this.cancelled.next();clearInterval(this.resendTimer);clearInterval(this.verificationTimer);
    this.resendSeconds.set(0);this.verificationSeconds.set(0);
    this.deadlines.clear();this.resendForm.reset();
    this.retryLink='';this.retryingLink.set(false);this.form.reset();this.digits.set('');
    this.errorMessage.set('');this.notice.set('');this.codeEntry.set(false);this.phase.set('initial');
  }
  protected goBackToLogin(): void {
    this.clearTransient();
    if (this.embedded()) this.login.emit();
    else void this.router.navigate(['/login'], { replaceUrl: true });
  }
  protected tokenError(): string {
    const c=this.form.controls.token;
    return c.invalid && c.touched ? 'Pega el enlace de activación completo o su token.' : '';
  }
  protected emailError(): string {
    const c=this.resendForm.controls.email;
    return c.invalid && c.touched ? 'Ingresa un correo válido.' : '';
  }
  protected enterCode(): void {
    if (this.submitting()) return;
    if (this.resendForm.invalid) {this.resendForm.markAllAsTouched();return;}
    this.codeEntry.set(true);this.editingEmail.set(false);this.phase.set('entering-code');
    this.errorMessage.set('');this.notice.set('');
  }
  protected verify(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {this.form.markAllAsTouched();return;}
    const token=emailActionToken(this.form.controls.token.value,'verify-account');
    if (!token) {this.form.controls.token.setErrors({pattern:true});this.form.controls.token.markAsTouched();return;}
    this.verifyLink(token);
  }
  protected retryLastLink(): void { if (this.retryLink) this.verifyLink(this.retryLink); }
  private verifyLink(token: string): void {
    if (this.submitting() || this.verificationSeconds()>0) return;
    this.retryLink=token;this.retryingLink.set(false);
    this.run(this.auth.verifyEmail(token),'verifying-link',()=>this.complete(), false);
  }
  protected updateDigits(code: string): void {
    if (this.submitting() || !/^\d{0,6}$/.test(code)) return;
    this.digits.set(code);this.errorMessage.set('');this.codeInvalid.set(false);this.retryCode.set(false);
  }
  protected verifyCode(): void {
    if (this.submitting() || this.verificationSeconds()>0 || !/^\d{6}$/.test(this.digits())) return;
    if (this.resendForm.invalid) {this.resendForm.markAllAsTouched();return;}
    this.retryCode.set(false);this.codeInvalid.set(false);
    this.run(this.auth.verifyEmailCode(this.address(),this.digits()),'verifying-code',()=>this.complete(),false);
  }
  private complete(): void {
    this.deadlines.clear();this.resendForm.reset();
    this.retryLink='';this.retryingLink.set(false);this.form.reset();this.digits.set('');
    this.notice.set('');this.errorMessage.set('');this.phase.set('verified');
    clearInterval(this.resendTimer);clearInterval(this.verificationTimer);
    this.resendSeconds.set(0);this.verificationSeconds.set(0);
  }
  private address(): string {return this.resendForm.controls.email.value.trim().toLowerCase();}
  protected maskedEmail(): string {
    if (this.resendForm.invalid) return '';
    const [local,domain]=this.address().split('@');
    return domain ? `${local[0] ?? ''}•••@${domain}` : '';
  }
  protected resend(): void {
    if (this.submitting() || this.resendSeconds()>0) return;
    if (this.resendForm.invalid) {this.resendForm.markAllAsTouched();return;}
    this.run(this.auth.resendVerification(this.address()),'requesting',()=>{
      this.codeEntry.set(true);this.editingEmail.set(false);this.phase.set('instructions');
      this.notice.set('Si tu cuenta puede activarse, revisa la bandeja de entrada y el correo no deseado: recibirás un enlace y un código.');
      this.startCooldown(this.cooldownSeconds);
    },true);
  }
  private run(request:Observable<void>, operation:'requesting'|'verifying-code'|'verifying-link', success:()=>void, sending:boolean): void {
    this.phase.set(operation);this.errorMessage.set('');this.notice.set('');
    request.pipe(takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef)).subscribe({
      next:success,
      error:(error:unknown)=>{
        const transient=error instanceof ApiError && (error.kind==='connection'||error.kind==='invalid-response'||error.status>=500);
        this.phase.set(transient ? 'recoverable-network-error' : error instanceof ApiError && error.status===429
          ? 'rate-limited' : error instanceof ApiError && error.status===410 ? 'expired' : 'entering-code');
        if (error instanceof ApiError && error.status===429 && error.retryAfterSeconds) {
          if (sending) this.startCooldown(error.retryAfterSeconds);
          else this.startVerificationCooldown(error.retryAfterSeconds);
        }
        this.retryCode.set(transient && operation==='verifying-code');
        this.retryingLink.set(transient && operation==='verifying-link');
        this.codeInvalid.set(!transient && operation==='verifying-code' && error instanceof ApiError && [400,410].includes(error.status));
        this.errorMessage.set(sending && transient
          ? 'No pudimos confirmar la solicitud. Si recibiste un código, puedes ingresarlo aquí. También puedes usar un enlace existente.'
          : error instanceof ApiError && [400,410].includes(error.status)
            ? sending ? 'No se pudo completar la solicitud. Revisa el correo e inténtalo de nuevo.'
              : operation==='verifying-link' ? 'El enlace no es válido, venció o ya fue utilizado.' : 'El código no es válido, venció o ya fue utilizado. Revisa el código o solicita nuevas instrucciones.'
            : describeApiError(error,'form'));
      },
    });
  }
  private startVerificationCooldown(seconds:number):void {
    clearInterval(this.verificationTimer);
    const deadline=Date.now()+seconds*1000;
    const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));this.verificationSeconds.set(remaining);if(!remaining)clearInterval(this.verificationTimer);};
    tick();this.verificationTimer=setInterval(tick,1000);
  }
  private startCooldown(seconds:number):void {
    this.deadlines.set(this.address(),Date.now()+seconds*1000);this.refreshCountdown();
  }
  private refreshCountdown():void {
    clearInterval(this.resendTimer);
    const deadline=this.deadlines.get(this.address()) ?? 0;
    const tick=()=>{const value=Math.max(0,Math.ceil((deadline-Date.now())/1000));this.resendSeconds.set(value);if(!value)clearInterval(this.resendTimer);};
    tick();if(this.resendSeconds()>0)this.resendTimer=setInterval(tick,1000);
  }
}
