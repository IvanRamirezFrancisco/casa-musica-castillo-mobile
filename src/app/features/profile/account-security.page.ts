import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup, FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { IonToolbar, IonButtons, IonBackButton, IonContent } from '@ionic/angular';
import { Observable, Subject, catchError, forkJoin, of, switchMap, takeUntil, tap } from 'rxjs';
import {
  AccountSession,
  HttpAccountSecurityRepository,
  SecurityMethods,
  TotpEnrollment,
} from '../../core/infrastructure/http-account-security.repository';
import type { AccountSecurityCapabilities, PendingGoogleLinkConfirmation, TwoFactorMethod } from '../../core/models/auth.model';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { AuthService } from '../../core/services/auth.service';
import { GoogleRegistrationStateService } from '../../core/services/google-registration-state.service';
import { AppNotificationVariant, NotificationService } from '../../core/services/notification.service';
import { describeApiError } from '../../core/api/api-error-message';
import { ApiError } from '../../core/api/api-error';
import {
  FIELD_LIMITS,
  FIELD_MESSAGES,
  passwordByteLength,
  passwordCharacterTypes,
  passwordValidator,
  passwordsMatch,
} from '../../core/validation/auth-fields.validation';
import { CmcInputComponent } from '../../shared/ui/input/cmc-input.component';
import { ActionDialogComponent } from '../../shared/ui/action-dialog/action-dialog.component';
import { GoogleLinkConfirmSheetComponent } from '../../shared/ui/google-link-confirm-sheet/google-link-confirm-sheet.component';
import { GoogleSigninButtonComponent } from '../../shared/ui/google-signin-button/google-signin-button.component';
import { DeletionRequestPage } from '../privacy/deletion-request.page';

@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonContent,
    CmcButtonComponent,
    CmcIconComponent,
    CmcInputComponent,
    ActionDialogComponent,
    GoogleLinkConfirmSheetComponent,
    GoogleSigninButtonComponent,
    DeletionRequestPage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-security.page.html',
  styleUrl: './account-security.page.scss',
})
export class AccountSecurityPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly repo = inject(HttpAccountSecurityRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly registrationState = inject(GoogleRegistrationStateService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly cancelled = new Subject<void>();
  private readonly googleLinkNoticeMs = 4_000;
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  private activeToastId: number | null = null;
  private cached = false;

  readonly methods = signal<SecurityMethods | null>(null);
  readonly accountCapabilities = signal<AccountSecurityCapabilities | null>(null);
  readonly enrollment = signal<TotpEnrollment | null>(null);
  readonly codes = signal<string[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly disabling = signal(false);
  readonly disablingEmail = signal(false);
  readonly disablingBackup = signal(false);
  readonly generating = signal(false);
  code = '';
  private readonly stepUp = signal('');
  get stepUpPassword(): string { return this.stepUp(); }
  set stepUpPassword(value: string) { this.stepUp.set(value); }

  readonly backupCount = signal<number | null>(null);
  readonly passwordChangeAvailable = signal(false);
  readonly passwordCapability = signal<
    'loading' | 'available' | 'set-initial' | 'unsupported' | 'recovery-required' | 'error' | 'incompatible' | 'session-expired'
  >('loading');
  readonly passwordCapabilityError = signal('');
  readonly passwordFocused = signal(false);
  readonly passwordExpanded = signal(false);
  readonly enablingEmail = signal(false);
  readonly sessionsOpen = signal(false);
  readonly deletionOpen = signal(false);
  readonly sessions = signal<readonly AccountSession[] | null>(null);

  readonly linkingGoogle = signal(false);
  readonly pendingGoogleLink = signal<PendingGoogleLinkConfirmation | null>(null);
  readonly confirmingGoogleLink = signal(false);
  readonly confirmLinkError = signal('');
  readonly linkGoogleBtn = viewChild<GoogleSigninButtonComponent>('linkGoogleBtn');
  readonly unlinkingGoogle = signal(false);
  readonly initialPasswordOpen = signal(false);
  readonly initialPasswordStep = signal<'reauth' | 'form'>('reauth');
  readonly modalMfaMethod = signal<TwoFactorMethod>('GOOGLE_AUTHENTICATOR');
  readonly requiresGoogleStepUp = computed(() => {
    const caps = this.accountCapabilities();
    return caps !== null && !caps.hasLocalPassword && caps.googleLinked;
  });
  readonly availableMfaMethods = computed<readonly TwoFactorMethod[]>(() => {
    const m = this.methods();
    if (!m) return ['GOOGLE_AUTHENTICATOR', 'EMAIL', 'BACKUP_CODE'];
    const list: TwoFactorMethod[] = [];
    if (m.GOOGLE_AUTHENTICATOR) list.push('GOOGLE_AUTHENTICATOR');
    if (m.EMAIL) list.push('EMAIL');
    if (m.BACKUP_CODES) list.push('BACKUP_CODE');
    return list;
  });

  private confirmLinkSub: { unsubscribe(): void } | null = null;
  private initialPasswordReauthToken = signal<string | null>(null);
  linkPassword = '';
  unlinkPassword = '';
  unlinkConfirmed = false;
  modalMfaCode = '';

  readonly limits = FIELD_LIMITS;
  readonly ringRadius = 46;
  readonly ringCircumference = 289.03;

  readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.maxLength(255)]],
    password: ['', [passwordValidator]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  readonly initialPasswordForm = this.fb.group({
    password: ['', [passwordValidator]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  constructor() {
    this.auth.sessionEnded$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.dismissNotice();
      this.clearSecrets();
      this.methods.set(null);
      this.accountCapabilities.set(null);
      this.backupCount.set(null);
      this.passwordChangeAvailable.set(false);
      this.passwordCapability.set('session-expired');
    });
    this.destroyRef.onDestroy(() => {
      this.clearNoticeTimer();
      this.clearSecrets();
    });
    this.reload();
  }

  ionViewWillLeave(): void {
    this.cached = true;
    this.dismissNotice();
    this.clearSecrets();
    this.deletionOpen.set(false);
  }

  ionViewDidLeave(): void {
    this.dismissNotice();
    this.clearSecrets();
  }

  dismissNotice(): void {
    this.clearNoticeTimer();
    if (this.activeToastId !== null) {
      this.notifications.dismiss(this.activeToastId);
      this.activeToastId = null;
    }
    this.notice.set('');
  }

  ionViewWillEnter(): void {
    if (this.cached) {
      this.cached = false;
      this.reload();
    }
  }

  clearSecrets(): void {
    this.cancelled.next();
    this.busy.set(false);
    this.enrollment.set(null);
    this.codes.set([]);
    this.code = '';
    this.stepUpPassword = '';
    this.generating.set(false);
    this.disabling.set(false);
    this.disablingEmail.set(false);
    this.disablingBackup.set(false);
    this.passwordForm.reset();
    this.passwordExpanded.set(false);
    this.sessions.set(null);
    this.enablingEmail.set(false);
    this.sessionsOpen.set(false);
    this.passwordFocused.set(false);
    this.linkingGoogle.set(false);
    this.confirmLinkSub?.unsubscribe();
    this.confirmLinkSub = null;
    this.cancelPendingGoogleLinkSilently();
    this.unlinkingGoogle.set(false);
    this.initialPasswordOpen.set(false);
    this.initialPasswordStep.set('reauth');
    this.initialPasswordReauthToken.set(null);
    this.initialPasswordForm.reset();
    this.linkPassword = '';
    this.unlinkPassword = '';
    this.unlinkConfirmed = false;
    this.modalMfaCode = '';
    this.error.set('');
  }

  openSessions(): void {
    this.sessionsOpen.set(true);
    this.loadSessions();
  }

  loadSessions(): void {
    this.run(this.repo.sessions(), sessions => this.sessions.set(sessions));
  }

  revokeSession(session: AccountSession): void {
    if (session.current || this.busy()) return;
    this.run(this.repo.revokeSession(session.id), () => {
      this.sessions.update(sessions => sessions?.filter(item => item.id !== session.id) ?? null);
      this.showTemporaryNotice('Sesión cerrada.', 'success', 'Sesión cerrada');
    });
  }

  revokeOtherSessions(): void {
    const others = this.sessions()?.filter(session => !session.current) ?? [];
    if (this.busy() || !others.length || !this.sessions()?.some(session => session.current)) return;
    this.run(forkJoin(others.map(session => this.repo.revokeSession(session.id).pipe(
      catchError(() => of(null)),
    ))), () => {
      this.loadSessions();
      this.showTemporaryNotice('Se actualizó el listado. Comprueba las sesiones que siguen activas.', 'info', 'Sesiones actualizadas');
    });
  }

  passwordHasValues(): boolean {
    return Object.values(this.passwordForm.getRawValue()).some(Boolean);
  }

  initialPasswordHasValues(): boolean {
    return Object.values(this.initialPasswordForm.getRawValue()).some(Boolean)
      || Boolean(this.initialPasswordReauthToken())
      || Boolean(this.modalMfaCode);
  }

  validCode(): boolean { return /^\d{6}$/.test(this.code); }

  validStepUp(): boolean { return this.stepUpPassword.trim().length > 0 && this.stepUpPassword.length <= 255; }

  modalMfaCodeValid(): boolean {
    const caps = this.accountCapabilities();
    if (!caps?.mfaActive) return true;
    const trimmed = this.modalMfaCode.trim();
    return this.modalMfaMethod() === 'BACKUP_CODE' ? trimmed.length >= 6 : /^\d{6}$/.test(trimmed);
  }

  validLinkPrecheck(): boolean {
    return this.linkPassword.trim().length > 0 && this.linkPassword.length <= 255 && this.modalMfaCodeValid();
  }

  validUnlinkForm(): boolean {
    return this.unlinkPassword.trim().length > 0 && this.unlinkPassword.length <= 255 && this.unlinkConfirmed && this.modalMfaCodeValid();
  }

  activeControlsCount(m: SecurityMethods): number {
    return [m.EMAIL, m.GOOGLE_AUTHENTICATOR, m.BACKUP_CODES].filter(Boolean).length;
  }

  ringStrokeDashoffset(m: SecurityMethods): number {
    const completed = this.activeControlsCount(m);
    return Number((this.ringCircumference * (1 - completed / 3)).toFixed(2));
  }

  passwordChecklist(control: AbstractControl<string> = this.passwordForm.controls.password) {
    const value = control.value;
    const length = value.length >= FIELD_LIMITS.passwordMin && value.length <= FIELD_LIMITS.passwordMax;
    const tooLong = value.length > FIELD_LIMITS.passwordMax || passwordByteLength(value) > FIELD_LIMITS.passwordMaxBytes;
    const variety = passwordCharacterTypes(value) === 4;
    const valid = control.valid;
    const feedback: 'negative' | 'warning' | 'positive' = valid ? 'positive' : !tooLong && (length || variety) ? 'warning' : 'negative';
    const strength = valid ? 'Fuerte' : feedback === 'warning' ? 'Media' : 'Débil';
    const level = valid ? 3 : feedback === 'warning' ? 2 : value ? 1 : 0;
    return { length, variety, tooLong, feedback, strength, level } as const;
  }

  passwordsCoincide(form: FormGroup = this.passwordForm): boolean {
    const confirmControl = form.get('confirmPassword');
    return !!confirmControl?.value && !form.hasError('passwordMismatch');
  }

  reload(): void {
    if (this.busy()) return;
    this.passwordCapability.set('loading');
    this.passwordChangeAvailable.set(false);
    this.passwordCapabilityError.set('');

    const hasCapabilities = typeof (this.repo as Partial<HttpAccountSecurityRepository>).capabilities === 'function';
    const passwordCheck$: Observable<boolean> = hasCapabilities
      ? this.repo.capabilities().pipe(
          tap(caps => this.applyCapabilities(caps)),
          switchMap(caps => of(caps.canChangePassword && caps.passwordChangeRevokesSessions)),
          catchError(error => this.handleCapabilityError(error)),
        )
      : this.repo.passwordChangeRevokesSessions().pipe(
          tap(available => {
            this.passwordChangeAvailable.set(available);
            this.passwordCapability.set(available ? 'available' : 'unsupported');
          }),
          catchError(error => this.handleCapabilityError(error)),
        );

    this.run(forkJoin({
      methods: this.repo.methods(),
      passwordChange: passwordCheck$,
      backupCount: this.repo.availableBackupCodes().pipe(catchError(() => of(null))),
    }), ({ methods, passwordChange, backupCount }) => {
      this.methods.set(methods);
      this.passwordChangeAvailable.set(passwordChange);
      this.backupCount.set(backupCount);
      this.handlePendingGoogleLinkIntent();
    });
  }

  private handlePendingGoogleLinkIntent(): void {
    const caps = this.accountCapabilities();
    if (!caps || !this.registrationState.consumeLinkIntent()) return;
    if (caps.canLinkGoogle) {
      this.initModalMfa();
      this.linkingGoogle.set(true);
      this.showTemporaryNotice('Confirma tu contraseña actual y selecciona tu cuenta de Google para completar la vinculación.', 'info', 'Vincular cuenta de Google');
    } else if (caps.googleLinked) {
      this.showTemporaryNotice('Tu cuenta ya tiene Google vinculado.', 'info', 'Cuenta vinculada');
    }
  }

  setup(): void {
    if (this.busy()) return;
    this.clearSecrets();
    this.run(this.repo.setup(), e => this.enrollment.set(e));
  }

  confirm(): void {
    if (!this.validCode()) return;
    this.run(this.repo.confirm(this.code), () => {
      this.clearSecrets();
      this.showTemporaryNotice('Autenticador confirmado por el servidor.', 'success', 'Autenticador activado');
      this.reload();
    });
  }

  changeEmail(enabled: boolean): void {
    if (!enabled) {
      this.clearSecrets();
      this.initModalMfa();
      this.disablingEmail.set(true);
      return;
    }
    this.run(this.repo.email(true), () => {
      this.enablingEmail.set(false);
      this.showTemporaryNotice('Método actualizado por el servidor.', 'success', 'Correo activado');
      this.reload();
    });
  }

  confirmDisableEmail(): void {
    if (!this.validStepUp()) return;
    const pwd = this.stepUpPassword;
    this.run(this.repo.email(false, pwd), () => {
      this.clearSecrets();
      this.showTemporaryNotice('Método actualizado por el servidor.', 'success', 'Correo desactivado');
      this.reload();
    });
  }

  requestDisable(): void {
    this.clearSecrets();
    this.initModalMfa();
    this.disabling.set(true);
  }

  disable(): void {
    if (!this.validStepUp()) return;
    const pwd = this.stepUpPassword;
    this.run(this.repo.disableTotp(pwd), () => {
      this.clearSecrets();
      this.showTemporaryNotice('Aplicación autenticadora desactivada.', 'success', 'Autenticador desactivado');
      this.reload();
    });
  }

  openGenerateBackup(): void {
    this.clearSecrets();
    this.initModalMfa();
    this.generating.set(true);
  }

  openDisableBackup(): void {
    this.clearSecrets();
    this.initModalMfa();
    this.disablingBackup.set(true);
  }

  generate(): void {
    if (!this.validStepUp()) return;
    const pwd = this.stepUpPassword;
    this.codes.set([]);
    this.run(this.repo.generate(pwd), codes => {
      this.stepUpPassword = '';
      this.generating.set(false);
      this.codes.set(codes);
      this.backupCount.set(codes.length);
    });
  }

  disableBackup(): void {
    if (!this.validStepUp()) return;
    const pwd = this.stepUpPassword;
    this.run(this.repo.disableBackupCodes(pwd), () => {
      this.clearSecrets();
      this.showTemporaryNotice('Códigos de recuperación desactivados.', 'success', 'Códigos desactivados');
      this.reload();
    });
  }

  openLinkGoogle(): void {
    if (this.busy() || this.confirmingGoogleLink() || !this.accountCapabilities()?.canLinkGoogle) return;
    this.clearSecrets();
    this.initModalMfa();
    this.linkingGoogle.set(true);
  }

  prepareLinkGoogle(event: { idToken: string; nonce: string }): void {
    if (this.busy() || this.confirmingGoogleLink() || !this.validLinkPrecheck()) return;
    const caps = this.accountCapabilities();
    const password = this.linkPassword;
    const mfaCode = this.modalMfaCode.trim();
    this.run(
      this.repo.prepareLinkGoogle({
        idToken: event.idToken,
        nonce: event.nonce,
        currentPassword: password,
        ...(caps?.mfaActive ? { mfaMethod: this.modalMfaMethod(), mfaCode } : {}),
      }).pipe(tap({ error: () => { void this.linkGoogleBtn()?.refreshChallenge(); } })),
      (confirmation) => {
        this.clearSecrets();
        this.pendingGoogleLink.set(confirmation);
        this.confirmLinkError.set('');
      },
      'form',
    );
  }

  confirmPendingGoogleLink(): void {
    const pending = this.pendingGoogleLink();
    if (!pending || this.busy() || this.confirmingGoogleLink()) return;
    this.confirmingGoogleLink.set(true);
    this.confirmLinkError.set('');
    this.confirmLinkSub?.unsubscribe();
    this.confirmLinkSub = this.repo.confirmLinkGoogle(pending.confirmationToken).subscribe({
      next: (updatedCaps) => {
        this.confirmLinkSub = null;
        this.confirmingGoogleLink.set(false);
        this.pendingGoogleLink.set(null);
        this.confirmLinkError.set('');
        this.applyCapabilities(updatedCaps);
        this.showTemporaryNotice('Cuenta de Google vinculada correctamente.', 'success', 'Google vinculado');
      },
      error: (err: unknown) => {
        this.confirmLinkSub = null;
        this.confirmingGoogleLink.set(false);
        const message = describeApiError(err, 'form');
        const retryable = err instanceof ApiError
          && (err.kind === 'connection' || err.status === 0 || err.status >= 500);
        if (retryable) {
          this.confirmLinkError.set(message);
          return;
        }
        this.pendingGoogleLink.set(null);
        this.confirmLinkError.set('');
        this.error.set(message);
        this.notifications.error('No pudimos completar la vinculación', message);
      },
    });
  }

  cancelPendingGoogleLink(notify = true): void {
    if (this.confirmingGoogleLink()) return;
    const pending = this.pendingGoogleLink();
    this.confirmLinkSub?.unsubscribe();
    this.confirmLinkSub = null;
    this.pendingGoogleLink.set(null);
    this.confirmLinkError.set('');
    if (!pending) return;
    this.repo.cancelLinkGoogle(pending.confirmationToken).subscribe({ error: () => undefined });
    if (notify) {
      this.showTemporaryNotice('No se vinculó ninguna cuenta de Google.', 'info', 'Vinculación cancelada');
    }
  }

  private cancelPendingGoogleLinkSilently(): void {
    const pending = this.pendingGoogleLink();
    this.pendingGoogleLink.set(null);
    this.confirmLinkError.set('');
    this.confirmingGoogleLink.set(false);
    if (pending) {
      this.repo.cancelLinkGoogle(pending.confirmationToken).subscribe({ error: () => undefined });
    }
  }

  openUnlinkGoogle(): void {
    if (this.busy() || !this.accountCapabilities()?.canUnlinkGoogle) return;
    this.clearSecrets();
    this.initModalMfa();
    this.unlinkingGoogle.set(true);
  }

  confirmUnlinkGoogle(): void {
    if (this.busy() || !this.validUnlinkForm()) return;
    const caps = this.accountCapabilities();
    const password = this.unlinkPassword;
    const mfaCode = this.modalMfaCode.trim();
    this.run(this.repo.unlinkGoogle({
      currentPassword: password,
      confirmed: true,
      ...(caps?.mfaActive ? { mfaMethod: this.modalMfaMethod(), mfaCode } : {}),
    }), (updatedCaps) => {
      this.clearSecrets();
      this.applyCapabilities(updatedCaps);
      this.showTemporaryNotice('Cuenta de Google desvinculada de tu perfil.', 'success', 'Google desvinculado');
    }, 'form');
  }

  openInitialPasswordSetup(): void {
    if (this.busy() || this.passwordCapability() !== 'set-initial') return;
    this.clearSecrets();
    this.initModalMfa();
    this.initialPasswordStep.set('reauth');
    this.initialPasswordOpen.set(true);
  }

  completeInitialPasswordReauth(event: { idToken: string; nonce: string }): void {
    const caps = this.accountCapabilities();
    if (this.busy() || !caps || !this.modalMfaCodeValid()) return;
    this.run(this.repo.reauthenticateWithGoogle({
      idToken: event.idToken,
      nonce: event.nonce,
      purpose: 'SET_INITIAL_PASSWORD',
      ...(caps.mfaActive ? { mfaMethod: this.modalMfaMethod(), mfaCode: this.modalMfaCode.trim() } : {}),
    }), (token) => {
      this.modalMfaCode = '';
      this.initialPasswordReauthToken.set(token);
      this.initialPasswordStep.set('form');
    }, 'form');
  }

  saveInitialPassword(): void {
    const token = this.initialPasswordReauthToken();
    if (this.busy() || !token) return;
    if (this.initialPasswordForm.invalid) {
      this.initialPasswordForm.markAllAsTouched();
      return;
    }
    const newPassword = this.initialPasswordForm.controls.password.value;
    this.initialPasswordReauthToken.set(null);
    this.run(this.repo.setInitialPassword(token, newPassword), () => {
      this.initialPasswordForm.reset();
      this.initialPasswordOpen.set(false);
      this.showTemporaryNotice('Contraseña configurada. Inicia sesión con tu correo y contraseña o con Google.', 'success', 'Contraseña configurada');
      void this.auth.clearAfterPasswordChange().finally(() => {
        if (this.router.url === '/profile/security') {
          void this.router.navigate(['/login'], { replaceUrl: true, state: { passwordConfigured: true } });
        }
      });
    }, 'form');
  }

  executeGoogleStepUpAction(event: { idToken: string; nonce: string }): void {
    const caps = this.accountCapabilities();
    if (this.busy() || !caps || !this.modalMfaCodeValid()) return;
    const reauth$ = this.repo.reauthenticateWithGoogle({
      idToken: event.idToken,
      nonce: event.nonce,
      purpose: 'SECURITY_STEP_UP',
      ...(caps.mfaActive ? { mfaMethod: this.modalMfaMethod(), mfaCode: this.modalMfaCode.trim() } : {}),
    });

    if (this.disablingEmail()) {
      this.run(reauth$.pipe(switchMap(token => this.repo.email(false, { reauthToken: token }))), () => {
        this.clearSecrets();
        this.showTemporaryNotice('Método actualizado por el servidor.', 'success', 'Correo desactivado');
        this.reload();
      }, 'form');
    } else if (this.disabling()) {
      this.run(reauth$.pipe(switchMap(token => this.repo.disableTotp({ reauthToken: token }))), () => {
        this.clearSecrets();
        this.showTemporaryNotice('Aplicación autenticadora desactivada.', 'success', 'Autenticador desactivado');
        this.reload();
      }, 'form');
    } else if (this.generating()) {
      this.codes.set([]);
      this.run(reauth$.pipe(switchMap(token => this.repo.generate({ reauthToken: token }))), (codes) => {
        this.modalMfaCode = '';
        this.generating.set(false);
        this.codes.set(codes);
        this.backupCount.set(codes.length);
      }, 'form');
    } else if (this.disablingBackup()) {
      this.run(reauth$.pipe(switchMap(token => this.repo.disableBackupCodes({ reauthToken: token }))), () => {
        this.clearSecrets();
        this.showTemporaryNotice('Códigos de recuperación desactivados.', 'success', 'Códigos desactivados');
        this.reload();
      }, 'form');
    }
  }

  sendModalEmailCode(): void {
    if (this.busy()) return;
    this.run(this.repo.sendAuthenticatedEmailTwoFactorCode(), () => {
      this.showTemporaryNotice('Código enviado a tu correo.', 'info', 'Código enviado');
    }, 'form');
  }

  onModalGoogleCancelled(): void {
    this.clearNoticeTimer();
    this.error.set('');
    this.showTemporaryNotice('Verificación con Google cancelada.', 'warning', 'Operación cancelada');
  }

  onModalGoogleError(message: string): void {
    this.dismissNotice();
    this.error.set(message);
  }

  passwordError(
    field: 'currentPassword' | 'password' | 'confirmPassword',
    form: FormGroup = this.passwordForm,
  ): string {
    const control = form.get(field);
    if (!control || !control.touched) return '';
    if (field === 'confirmPassword' && control.valid && form.hasError('passwordMismatch')) {
      return 'Las contraseñas no coinciden.';
    }
    const key = Object.keys(control.errors ?? {})[0];
    return key ? FIELD_MESSAGES[key] ?? 'Revisa la contraseña.' : '';
  }

  changePassword(): void {
    if (!this.passwordChangeAvailable() || this.busy()) return;
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, password } = this.passwordForm.getRawValue();
    this.run(this.repo.changePassword(currentPassword, password), () => {
      this.passwordForm.reset();
      this.showTemporaryNotice('Contraseña actualizada. Inicia sesión con la nueva contraseña.', 'success', 'Contraseña actualizada');
      void this.auth.clearAfterPasswordChange().finally(() => {
        if (this.router.url === '/profile/security') {
          void this.router.navigate(['/login'], { replaceUrl: true, state: { passwordChanged: true } });
        }
      });
    }, 'form');
  }

  async copyKey(): Promise<void> {
    const key = this.enrollment()?.manualEntryKey;
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      this.showTemporaryNotice('Clave copiada. El portapapeles puede conservarla: bórrala después de configurarlo.', 'success', 'Clave copiada');
    } catch {
      this.showTemporaryNotice('No se pudo copiar. Introduce la clave manualmente.', 'warning', 'Copia manual');
    }
  }

  private applyCapabilities(caps: AccountSecurityCapabilities): void {
    this.accountCapabilities.set(caps);
    if (caps.canSetInitialPassword) {
      this.passwordChangeAvailable.set(false);
      this.passwordCapability.set('set-initial');
      return;
    }
    if (caps.canChangePassword) {
      this.passwordChangeAvailable.set(caps.passwordChangeRevokesSessions);
      this.passwordCapability.set(caps.passwordChangeRevokesSessions ? 'available' : 'unsupported');
      return;
    }
    this.passwordChangeAvailable.set(false);
    this.passwordCapability.set(caps.hasValidAuthMethod ? 'unsupported' : 'recovery-required');
  }

  private handleCapabilityError(error: unknown): Observable<boolean> {
    this.accountCapabilities.set(null);
    this.passwordCapability.set(
      error instanceof ApiError && error.status === 401
        ? 'session-expired'
        : error instanceof ApiError && error.kind === 'invalid-response'
          ? 'incompatible'
          : 'error',
    );
    this.passwordCapabilityError.set(describeApiError(error));
    return of(false);
  }

  private initModalMfa(): void {
    this.modalMfaCode = '';
    const available = this.availableMfaMethods();
    this.modalMfaMethod.set(available[0] ?? 'GOOGLE_AUTHENTICATOR');
  }

  private clearNoticeTimer(): void {
    if (this.noticeTimer !== undefined) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = undefined;
    }
  }

  private showTemporaryNotice(
    message: string,
    variant: AppNotificationVariant = 'success',
    title?: string,
    durationMs = this.googleLinkNoticeMs,
  ): void {
    this.clearNoticeTimer();
    const resolvedTitle = title ?? (
      variant === 'success'
        ? 'Operación completada'
        : variant === 'warning'
          ? 'Atención'
          : variant === 'error'
            ? 'Error'
            : 'Aviso de seguridad'
    );
    this.activeToastId = this.notifications.show({
      variant,
      title: resolvedTitle,
      message,
      durationMs,
    });
    this.notice.set(message);
    if (durationMs > 0) {
      this.noticeTimer = setTimeout(() => {
        this.noticeTimer = undefined;
        this.notice.set('');
      }, durationMs);
    }
  }

  private run<T>(request: Observable<T>, success: (data: T) => void, context: 'generic' | 'form' = 'generic'): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.clearNoticeTimer();
    this.error.set('');
    request.pipe(takeUntil(this.cancelled), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.busy.set(false);
        success(data);
      },
      error: error => {
        this.busy.set(false);
        this.dismissNotice();
        if (this.initialPasswordOpen() && this.initialPasswordStep() === 'form') {
          this.initialPasswordReauthToken.set(null);
          this.initialPasswordStep.set('reauth');
        }
        const message = describeApiError(error, context);
        this.error.set(message);
        this.notifications.error('No pudimos completar la acción', message);
      },
    });
  }
}
