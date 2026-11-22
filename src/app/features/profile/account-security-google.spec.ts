import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { Subject, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { ApiError } from '../../core/api/api-error';
import { GOOGLE_AUTH_AUTO_CONFIG } from '../../core/config/google-auth-config.token';
import {
  AccountSecurityCapabilities,
  StepUpProof,
  TwoFactorMethod,
} from '../../core/models/auth.model';
import {
  HttpAccountSecurityRepository,
  SecurityMethods,
} from '../../core/infrastructure/http-account-security.repository';
import { AuthService } from '../../core/services/auth.service';
import { GoogleRegistrationStateService } from '../../core/services/google-registration-state.service';
import { GoogleCredentialWindow } from '../../core/services/google-identity.service';
import { NotificationService } from '../../core/services/notification.service';
import { ActionDialogComponent } from '../../shared/ui/action-dialog/action-dialog.component';
import { AppNotificationsComponent } from '../../shared/ui/notifications/app-notifications.component';
import { DeletionRequestPage } from '../privacy/deletion-request.page';
import { AccountSecurityPage } from './account-security.page';

const baseCaps: AccountSecurityCapabilities = {
  twoFactorEnabled: false,
  googleAuthEnabled: false,
  emailEnabled: false,
  backupCodesEnabled: false,
  emailVerified: true,
  hasLocalPassword: false,
  googleLinked: true,
  googleConfigured: true,
  googleEmail: 'google.user@gmail.com',
  googleLinkedAt: '2026-11-20T12:00:00',
  canSetInitialPassword: true,
  canChangePassword: false,
  canLinkGoogle: false,
  canUnlinkGoogle: false,
  hasValidAuthMethod: true,
  mfaActive: false,
  requiresRecentAuth: true,
  passwordChangeRevokesSessions: true,
};

describe('AccountSecurityPage — gestión de métodos y escenarios A–E', () => {
  let repo: {
    methods: ReturnType<typeof vi.fn>;
    capabilities: ReturnType<typeof vi.fn>;
    passwordChangeRevokesSessions: ReturnType<typeof vi.fn>;
    availableBackupCodes: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
    setInitialPassword: ReturnType<typeof vi.fn>;
    reauthenticateWithGoogle: ReturnType<typeof vi.fn>;
    sendAuthenticatedEmailTwoFactorCode: ReturnType<typeof vi.fn>;
    linkGoogle: ReturnType<typeof vi.fn>;
    unlinkGoogle: ReturnType<typeof vi.fn>;
    setup: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    email: ReturnType<typeof vi.fn>;
    disableTotp: ReturnType<typeof vi.fn>;
    generate: ReturnType<typeof vi.fn>;
    disableBackupCodes: ReturnType<typeof vi.fn>;
    sessions: ReturnType<typeof vi.fn>;
    revokeSession: ReturnType<typeof vi.fn>;
    deletionAvailability: ReturnType<typeof vi.fn>;
    ownDeletionRequest: ReturnType<typeof vi.fn>;
    requestAccountDeletion: ReturnType<typeof vi.fn>;
    trackAccountDeletion: ReturnType<typeof vi.fn>;
  };
  let clearAfterPasswordChange: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let ended: Subject<void>;
  let currentUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ended = new Subject<void>();
    clearAfterPasswordChange = vi.fn().mockResolvedValue(undefined);
    currentUser = vi.fn().mockReturnValue({
      id: 7,
      email: 'google.user@gmail.com',
      firstName: 'Ana',
      lastName: 'Castillo',
      phone: null,
      hasLocalPassword: false,
      googleLinked: true,
      roles: ['ROLE_USER'],
      twoFactorEnabled: false,
    });

    repo = {
      methods: vi.fn<() => ReturnType<HttpAccountSecurityRepository['methods']>>().mockReturnValue(
        of<SecurityMethods>({ EMAIL: false, GOOGLE_AUTHENTICATOR: false, BACKUP_CODES: false }),
      ),
      capabilities: vi.fn().mockReturnValue(of(baseCaps)),
      passwordChangeRevokesSessions: vi.fn().mockReturnValue(of(true)),
      availableBackupCodes: vi.fn().mockReturnValue(of(0)),
      changePassword: vi.fn().mockReturnValue(of(undefined)),
      setInitialPassword: vi.fn().mockReturnValue(of(undefined)),
      reauthenticateWithGoogle: vi.fn().mockReturnValue(of('reauth-token-12345678901234567890')),
      sendAuthenticatedEmailTwoFactorCode: vi.fn().mockReturnValue(of(undefined)),
      linkGoogle: vi.fn().mockReturnValue(of({ ...baseCaps, hasLocalPassword: true, googleLinked: true, canSetInitialPassword: false, canChangePassword: true, canUnlinkGoogle: true })),
      unlinkGoogle: vi.fn().mockReturnValue(of({ ...baseCaps, hasLocalPassword: true, googleLinked: false, canSetInitialPassword: false, canChangePassword: true, canLinkGoogle: true, canUnlinkGoogle: false })),
      setup: vi.fn(),
      confirm: vi.fn(),
      email: vi.fn().mockReturnValue(of(undefined)),
      disableTotp: vi.fn().mockReturnValue(of(undefined)),
      generate: vi.fn().mockReturnValue(of(['1111-2222', '3333-4444'])),
      disableBackupCodes: vi.fn().mockReturnValue(of(undefined)),
      sessions: vi.fn().mockReturnValue(of([])),
      revokeSession: vi.fn().mockReturnValue(of(undefined)),
      deletionAvailability: vi.fn().mockReturnValue(of({
        available: true,
        publicEmailRequestEnabled: true,
        automaticDeletionEnabled: true,
        supportEmail: 'soporte@casamusicacastillo.com',
        tokenValidityMinutes: 30,
        retentionPolicyVersion: 'v1',
      })),
      ownDeletionRequest: vi.fn().mockReturnValue(throwError(() => new ApiError('http', 404))),
      requestAccountDeletion: vi.fn((proof: StepUpProof) => of({
        requestId: typeof proof === 'string' ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222',
        status: 'RECEIVED',
        receivedAt: '2026-11-20T12:00:00Z',
        completedAt: null,
      })),
      trackAccountDeletion: vi.fn(),
    };

    TestBed.overrideComponent(ActionDialogComponent, {
      set: {
        template: '<button type="button" (click)="closed.emit()">Cerrar</button><ng-container [ngTemplateOutlet]="content()" />',
      },
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideIonicAngular({ animated: false }),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
        { provide: GOOGLE_AUTH_AUTO_CONFIG, useValue: false },
        { provide: HttpAccountSecurityRepository, useValue: repo },
        {
          provide: AuthService,
          useValue: {
            sessionEnded$: ended.asObservable(),
            clearAfterPasswordChange,
            user: currentUser,
          },
        },
      ],
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/profile/security');
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    delete (window as unknown as GoogleCredentialWindow).google;
    vi.restoreAllMocks();
  });

  it('Escenario B: muestra "Configurar contraseña", bloquea desvincular Google y ejecuta flujo en 2 pasos', async () => {
    const fixture = TestBed.createComponent(AccountSecurityPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('#security-password')?.textContent).toContain('Configurar contraseña');
    expect(el.textContent).toContain('Tu cuenta utiliza Google para iniciar sesión.');
    expect(el.textContent).not.toContain('Cambiar contraseña');
    expect(el.querySelector('#security-login-methods')?.textContent).toContain('Métodos de inicio de sesión');
    expect(el.querySelector('.security-google-linked-pill')?.textContent).toContain('Google vinculada');

    // Unlink button must be disabled while hasLocalPassword === false
    const buttons = Array.from(el.querySelectorAll('button'));
    const unlinkBtn = buttons.find((b) => b.textContent?.includes('Desvincular Google'));
    expect(unlinkBtn?.disabled).toBe(true);

    // Step 1 -> open initial password setup -> Google reauth -> Step 2 -> setInitialPassword -> logout + /login
    fixture.componentInstance.openInitialPasswordSetup();
    fixture.detectChanges();
    expect(fixture.componentInstance.initialPasswordOpen()).toBe(true);
    expect(fixture.componentInstance.initialPasswordStep()).toBe('reauth');
    expect(el.querySelector('.security-step-pill')?.textContent).toContain('Paso 1 de 2');
    expect(el.querySelector('.security-step-label')?.textContent).toContain('Confirmar identidad');

    fixture.componentInstance.completeInitialPasswordReauth({ idToken: 'google-id-reauth', nonce: 'nonce-reauth-123456' });
    fixture.detectChanges();

    expect(repo.reauthenticateWithGoogle).toHaveBeenCalledWith({
      idToken: 'google-id-reauth',
      nonce: 'nonce-reauth-123456',
      purpose: 'SET_INITIAL_PASSWORD',
    });
    expect(fixture.componentInstance.initialPasswordStep()).toBe('form');
    expect(el.querySelector('.security-step-pill')?.textContent).toContain('Paso 2 de 2');
    expect(el.querySelector('.security-step-label')?.textContent).toContain('Crear contraseña');

    fixture.componentInstance.initialPasswordForm.setValue({
      password: 'NewLocal!Pass2026',
      confirmPassword: 'NewLocal!Pass2026',
    });
    fixture.componentInstance.saveInitialPassword();
    await Promise.resolve();

    expect(repo.setInitialPassword).toHaveBeenCalledWith(
      'reauth-token-12345678901234567890',
      'NewLocal!Pass2026',
    );
    expect(clearAfterPasswordChange).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      replaceUrl: true,
      state: { passwordConfigured: true },
    });
  });

  it('Escenario A y D: cuenta tradicional muestra "Cambiar contraseña" y permite vincular Google con contraseña + confirmación', () => {
    repo.capabilities.mockReturnValue(of<AccountSecurityCapabilities>({
      ...baseCaps,
      hasLocalPassword: true,
      googleLinked: false,
      googleEmail: null,
      canSetInitialPassword: false,
      canChangePassword: true,
      canLinkGoogle: true,
      canUnlinkGoogle: false,
      mfaActive: true,
    }));
    repo.methods.mockReturnValue(of<SecurityMethods>({ EMAIL: true, GOOGLE_AUTHENTICATOR: false, BACKUP_CODES: false }));

    const fixture = TestBed.createComponent(AccountSecurityPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('#security-password')?.textContent).toContain('Cambiar contraseña');
    expect(el.textContent).not.toContain('Configurar contraseña');

    fixture.componentInstance.openLinkGoogle();
    fixture.detectChanges();
    fixture.componentInstance.linkPassword = 'Current!Pass123';
    fixture.componentInstance.modalMfaCode = '654321';
    fixture.componentInstance.linkConfirmed = true;
    fixture.componentInstance.confirmLinkGoogle({ idToken: 'google-link-token', nonce: 'nonce-link-123456' });

    expect(repo.linkGoogle).toHaveBeenCalledWith({
      idToken: 'google-link-token',
      nonce: 'nonce-link-123456',
      currentPassword: 'Current!Pass123',
      confirmed: true,
      mfaMethod: 'EMAIL' as TwoFactorMethod,
      mfaCode: '654321',
    });
  });

  it('Escenario C: cuenta dual muestra "Cambiar contraseña" y permite desvincular Google con contraseña + confirmación', () => {
    repo.capabilities.mockReturnValue(of<AccountSecurityCapabilities>({
      ...baseCaps,
      hasLocalPassword: true,
      googleLinked: true,
      canSetInitialPassword: false,
      canChangePassword: true,
      canLinkGoogle: false,
      canUnlinkGoogle: true,
    }));

    const fixture = TestBed.createComponent(AccountSecurityPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('#security-password')?.textContent).toContain('Cambiar contraseña');
    expect(el.textContent).not.toContain('Configurar contraseña');

    fixture.componentInstance.openUnlinkGoogle();
    fixture.componentInstance.unlinkPassword = 'Dual!Pass123';
    fixture.componentInstance.unlinkConfirmed = true;
    fixture.componentInstance.confirmUnlinkGoogle();

    expect(repo.unlinkGoogle).toHaveBeenCalledWith({
      currentPassword: 'Dual!Pass123',
      confirmed: true,
    });
    expect(fixture.componentInstance.accountCapabilities()?.googleLinked).toBe(false);
  });

  it('Escenario E: muestra estado sin método válido y enlace seguro a recuperación', () => {
    repo.capabilities.mockReturnValue(of<AccountSecurityCapabilities>({
      ...baseCaps,
      hasLocalPassword: false,
      googleLinked: false,
      canSetInitialPassword: false,
      canChangePassword: false,
      canLinkGoogle: false,
      canUnlinkGoogle: false,
      hasValidAuthMethod: false,
    }));

    const fixture = TestBed.createComponent(AccountSecurityPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('no tiene un método de acceso válido');
    expect(el.querySelector('a[href="/forgot-password"]')).toBeTruthy();
    expect(el.textContent).not.toContain('Configurar contraseña');
  });

  it('usa step-up con reauthToken de Google para 2FA, códigos de respaldo y eliminación sin contraseña local', () => {
    repo.capabilities.mockReturnValue(of<AccountSecurityCapabilities>({
      ...baseCaps,
      hasLocalPassword: false,
      googleLinked: true,
      mfaActive: true,
      emailEnabled: true,
      twoFactorEnabled: true,
    }));
    repo.methods.mockReturnValue(of<SecurityMethods>({ EMAIL: true, GOOGLE_AUTHENTICATOR: true, BACKUP_CODES: false }));

    const fixture = TestBed.createComponent(AccountSecurityPage);
    fixture.detectChanges();

    // Disable TOTP via Google step-up + MFA
    fixture.componentInstance.requestDisable();
    fixture.detectChanges();
    expect(fixture.componentInstance.requiresGoogleStepUp()).toBe(true);
    fixture.componentInstance.modalMfaCode = '112233';
    fixture.componentInstance.executeGoogleStepUpAction({ idToken: 'google-stepup-id', nonce: 'nonce-stepup-123456' });

    expect(repo.reauthenticateWithGoogle).toHaveBeenCalledWith({
      idToken: 'google-stepup-id',
      nonce: 'nonce-stepup-123456',
      purpose: 'SECURITY_STEP_UP',
      mfaMethod: 'GOOGLE_AUTHENTICATOR',
      mfaCode: '112233',
    });
    expect(repo.disableTotp).toHaveBeenCalledWith({ reauthToken: 'reauth-token-12345678901234567890' });

    // DeletionRequestPage in Google passwordless mode uses DELETE_ACCOUNT reauthToken
    const delFixture = TestBed.createComponent(DeletionRequestPage);
    delFixture.componentRef.setInput('hasLocalPassword', false);
    delFixture.componentRef.setInput('googleLinked', true);
    delFixture.componentRef.setInput('mfaActive', false);
    delFixture.detectChanges();

    const delEl = delFixture.nativeElement as HTMLElement;
    expect(delEl.querySelector('#deletion-password')).toBeNull();
    delFixture.componentInstance.onGoogleReauth({ idToken: 'del-google-token', nonce: 'del-nonce-123456' });
    delFixture.detectChanges();
    expect(repo.reauthenticateWithGoogle).toHaveBeenCalledWith({
      idToken: 'del-google-token',
      nonce: 'del-nonce-123456',
      purpose: 'DELETE_ACCOUNT',
    });

    delFixture.componentInstance.confirmed = true;
    delFixture.componentInstance.submit();
    expect(repo.requestAccountDeletion).toHaveBeenCalledWith({ reauthToken: 'reauth-token-12345678901234567890' }, true);

    TestBed.inject(HttpTestingController).verify();
  });

  it('consume intención guiada de vinculación Google, abre el diálogo automáticamente, no muestra "Conectando" al estar deshabilitado y limpia secretos al cancelar', () => {
    repo.capabilities.mockReturnValue(of<AccountSecurityCapabilities>({
      ...baseCaps,
      hasLocalPassword: true,
      googleLinked: false,
      googleEmail: null,
      canSetInitialPassword: false,
      canChangePassword: true,
      canLinkGoogle: true,
      canUnlinkGoogle: false,
      mfaActive: true,
    }));
    repo.methods.mockReturnValue(of<SecurityMethods>({ EMAIL: true, GOOGLE_AUTHENTICATOR: false, BACKUP_CODES: false }));

    const regState = TestBed.inject(GoogleRegistrationStateService);
    regState.setLinkIntent();

    const fixture = TestBed.createComponent(AccountSecurityPage);
    fixture.detectChanges();

    expect(regState.hasActiveLinkIntent()).toBe(false);
    expect(fixture.componentInstance.linkingGoogle()).toBe(true);
    expect(fixture.componentInstance.modalMfaMethod()).toBe('EMAIL');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Confirma tu contraseña actual');
    expect(el.textContent).toContain('Contraseña');
    expect(el.textContent).toContain('Inicia sesión utilizando tu correo y contraseña');
    expect(el.textContent).toContain('Configurada');
    expect(el.textContent).toContain('No vinculada');
    expect(el.textContent).toContain('Opciones 2FA');
    expect(el.textContent).not.toContain('Conectando con Google');

    fixture.componentInstance.linkPassword = 'TempSecret!123';
    fixture.componentInstance.linkConfirmed = true;
    const cancelBtn = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancelar');
    expect(cancelBtn).toBeTruthy();
    cancelBtn!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.linkingGoogle()).toBe(false);
    expect(fixture.componentInstance.linkPassword).toBe('');
    expect(fixture.componentInstance.linkConfirmed).toBe(false);

    // When Google is linked, Email MFA section shows mailbox independence note
    repo.capabilities.mockReturnValue(of<AccountSecurityCapabilities>({
      ...baseCaps,
      hasLocalPassword: true,
      googleLinked: true,
      canSetInitialPassword: false,
      canChangePassword: true,
      canLinkGoogle: false,
      canUnlinkGoogle: true,
    }));
    const linkedFixture = TestBed.createComponent(AccountSecurityPage);
    linkedFixture.detectChanges();
    expect((linkedFixture.nativeElement as HTMLElement).textContent).toContain('comparten el mismo buzón');
    expect((linkedFixture.nativeElement as HTMLElement).textContent).toContain('Vinculada');
  });

  it('notificación de vinculación Google se oculta a los 4s, permite cierre manual, conserva estado Vinculada y no aplica timer a errores', () => {
    vi.useFakeTimers();
    try {
      const unlinkedCaps: AccountSecurityCapabilities = {
        ...baseCaps,
        hasLocalPassword: true,
        googleLinked: false,
        googleEmail: null,
        canSetInitialPassword: false,
        canChangePassword: true,
        canLinkGoogle: true,
        canUnlinkGoogle: false,
      };
      const linkedCaps: AccountSecurityCapabilities = {
        ...baseCaps,
        hasLocalPassword: true,
        googleLinked: true,
        googleEmail: 'vincular.real@gmail.com',
        canSetInitialPassword: false,
        canChangePassword: true,
        canLinkGoogle: false,
        canUnlinkGoogle: true,
      };
      repo.capabilities.mockReturnValue(of(unlinkedCaps));
      repo.linkGoogle.mockReturnValue(of(linkedCaps));

      const fixture = TestBed.createComponent(AccountSecurityPage);
      const toastFixture = TestBed.createComponent(AppNotificationsComponent);
      const notifications = TestBed.inject(NotificationService);
      fixture.detectChanges();
      toastFixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const toastEl = toastFixture.nativeElement as HTMLElement;

      // 1. Before backend confirmation, no link success notice or persistent inline banner exists
      expect(el.textContent).not.toContain('Cuenta de Google vinculada correctamente');
      expect(toastEl.querySelector('.cmc-toast')).toBeNull();

      fixture.componentInstance.openLinkGoogle();
      fixture.componentInstance.linkPassword = 'Current!Pass123';
      fixture.componentInstance.linkConfirmed = true;
      fixture.componentInstance.confirmLinkGoogle({ idToken: 'google-link-ok', nonce: 'nonce-link-ok-123' });
      fixture.detectChanges();
      toastFixture.detectChanges();

      expect(el.querySelector('.security-notice')).toBeNull();
      const toastNode = toastEl.querySelector('.cmc-toast--success');
      expect(toastNode?.getAttribute('role')).toBe('status');
      expect(toastNode?.getAttribute('aria-live')).toBe('polite');
      expect(toastNode?.textContent).toContain('Cuenta de Google vinculada correctamente.');
      expect(fixture.componentInstance.accountCapabilities()?.googleLinked).toBe(true);
      expect(el.textContent).toContain('Desvincular Google');

      // Still visible right before 4,000 ms, auto-hidden at 4,000 ms while preserving linked state
      vi.advanceTimersByTime(3999);
      fixture.detectChanges();
      toastFixture.detectChanges();
      expect(toastEl.querySelector('.cmc-toast')).toBeTruthy();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      toastFixture.detectChanges();
      expect(toastEl.querySelector('.cmc-toast')).toBeNull();
      expect(notifications.notifications().length).toBe(0);
      expect(fixture.componentInstance.notice()).toBe('');
      expect(fixture.componentInstance.accountCapabilities()?.googleLinked).toBe(true);
      expect(el.textContent).toContain('Vinculada');
      expect(el.textContent).toContain('Desvincular Google');

      // 2. Manual close button hides toast immediately without affecting linked state
      fixture.componentInstance.accountCapabilities.set(unlinkedCaps);
      fixture.componentInstance.openLinkGoogle();
      fixture.componentInstance.linkPassword = 'Current!Pass123';
      fixture.componentInstance.linkConfirmed = true;
      fixture.componentInstance.confirmLinkGoogle({ idToken: 'google-link-ok-2', nonce: 'nonce-link-ok-456' });
      fixture.detectChanges();
      toastFixture.detectChanges();

      const closeBtn = toastEl.querySelector<HTMLButtonElement>('.cmc-toast__close')!;
      expect(closeBtn).toBeTruthy();
      closeBtn.click();
      fixture.detectChanges();
      toastFixture.detectChanges();
      expect(toastEl.querySelector('.cmc-toast')).toBeNull();
      expect(fixture.componentInstance.accountCapabilities()?.googleLinked).toBe(true);

      // 3. Navigating away and returning does not re-show the notice
      fixture.componentInstance.accountCapabilities.set(unlinkedCaps);
      fixture.componentInstance.openLinkGoogle();
      fixture.componentInstance.linkPassword = 'Current!Pass123';
      fixture.componentInstance.linkConfirmed = true;
      fixture.componentInstance.confirmLinkGoogle({ idToken: 'google-link-ok-3', nonce: 'nonce-link-ok-789' });
      fixture.detectChanges();
      toastFixture.detectChanges();
      expect(toastEl.querySelector('.cmc-toast')).toBeTruthy();

      repo.capabilities.mockReturnValue(of(linkedCaps));
      fixture.componentInstance.ionViewWillLeave();
      fixture.componentInstance.ionViewDidLeave();
      fixture.componentInstance.ionViewWillEnter();
      fixture.detectChanges();
      toastFixture.detectChanges();
      expect(toastEl.querySelector('.cmc-toast')).toBeNull();
      expect(fixture.componentInstance.accountCapabilities()?.googleLinked).toBe(true);

      // 4. Consecutive link notices reset timers instead of stacking duplicate toasts
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      fixture.componentInstance.accountCapabilities.set(unlinkedCaps);
      fixture.componentInstance.openLinkGoogle();
      fixture.componentInstance.linkPassword = 'Current!Pass123';
      fixture.componentInstance.linkConfirmed = true;
      fixture.componentInstance.confirmLinkGoogle({ idToken: 'google-link-seq-1', nonce: 'nonce-seq-1' });
      vi.advanceTimersByTime(3000);
      fixture.componentInstance.accountCapabilities.set(unlinkedCaps);
      fixture.componentInstance.openLinkGoogle();
      fixture.componentInstance.linkPassword = 'Current!Pass123';
      fixture.componentInstance.linkConfirmed = true;
      fixture.componentInstance.confirmLinkGoogle({ idToken: 'google-link-seq-2', nonce: 'nonce-seq-2' });
      expect(clearSpy).toHaveBeenCalled();

      // At +1500ms (4500ms after first, 1500ms after second), second notice must still be visible and unstacked
      vi.advanceTimersByTime(1500);
      fixture.detectChanges();
      toastFixture.detectChanges();
      expect(toastEl.querySelectorAll('.cmc-toast').length).toBe(1);
      vi.advanceTimersByTime(2500);
      fixture.detectChanges();
      toastFixture.detectChanges();
      expect(toastEl.querySelector('.cmc-toast')).toBeNull();

      // 5. Error messages stay in inline alert (not auto-hidden at 4s); component destruction clears pending notice timer
      fixture.componentInstance.accountCapabilities.set(unlinkedCaps);
      repo.linkGoogle.mockReturnValue(throwError(() => new ApiError('http', 409, 'Esta cuenta de Google ya está vinculada a otro usuario.')));
      fixture.componentInstance.openLinkGoogle();
      fixture.componentInstance.linkPassword = 'Current!Pass123';
      fixture.componentInstance.linkConfirmed = true;
      fixture.componentInstance.confirmLinkGoogle({ idToken: 'google-link-dup', nonce: 'nonce-link-dup-123' });
      fixture.detectChanges();
      toastFixture.detectChanges();

      vi.advanceTimersByTime(10000);
      fixture.detectChanges();
      toastFixture.detectChanges();
      expect(fixture.componentInstance.error()).toContain('ya está vinculada');

      // Start a temporary notice and immediately destroy component -> pending timer is cancelled cleanly
      clearSpy.mockClear();
      repo.linkGoogle.mockReturnValue(of(linkedCaps));
      fixture.componentInstance.clearSecrets();
      fixture.componentInstance.openLinkGoogle();
      fixture.componentInstance.linkPassword = 'Current!Pass123';
      fixture.componentInstance.linkConfirmed = true;
      fixture.componentInstance.confirmLinkGoogle({ idToken: 'google-link-ok-4', nonce: 'nonce-link-ok-999' });
      fixture.destroy();
      toastFixture.destroy();
      expect(clearSpy).toHaveBeenCalled();
      vi.advanceTimersByTime(5000);
    } finally {
      vi.useRealTimers();
    }
  });
});
