import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouteReuseStrategy, Routes } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/api/api-base-url.token';
import { fakeJwt, profileDto, testSession } from '../../../core/api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../../../core/config/backend-session.token';
import { GOOGLE_AUTH_AUTO_CONFIG } from '../../../core/config/google-auth-config.token';
import { PUBLIC_CATALOG_ENABLED } from '../../../core/repositories/public-catalog.repository';
import { authInterceptor } from '../../../core/security/auth.interceptor';
import { SESSION_STORE } from '../../../core/security/session-store.token';
import { AuthService } from '../../../core/services/auth.service';
import {
  GOOGLE_CREDENTIAL_PLUGIN,
  GoogleCredentialPlugin,
  GoogleCredentialWindow,
} from '../../../core/services/google-identity.service';
import { GoogleRegistrationStateService } from '../../../core/services/google-registration-state.service';
import { SplashPage } from '../../splash/splash.page';
import { CompleteGoogleAccountPage } from './complete-google-account.page';
import { ConnectedLoginPage } from './connected-login.page';
import { ConnectedRegisterPage } from './connected-register.page';

@Component({ selector: 'app-home-stub', standalone: true, template: '<p>Home stub</p>' })
class HomeStubComponent {}

@Component({ selector: 'app-privacy-stub', standalone: true, template: '<p>Privacy stub</p>' })
class PrivacyStubComponent {}

@Component({ selector: 'app-orders-stub', standalone: true, template: '<p>Orders stub</p>' })
class OrdersStubComponent {}

@Component({ selector: 'app-security-stub', standalone: true, template: '<p>Security stub</p>' })
class SecurityStubComponent {}

const base = 'https://api.example.test';
const CLIENT_ID = '1234567890-web.apps.googleusercontent.com';

const routes: Routes = [
  { path: 'splash', component: SplashPage },
  { path: 'login', component: ConnectedLoginPage },
  { path: 'register', component: ConnectedRegisterPage },
  { path: 'complete-account', component: CompleteGoogleAccountPage },
  { path: 'privacy', component: PrivacyStubComponent },
  { path: 'profile/security', component: SecurityStubComponent },
  { path: 'main/home', component: HomeStubComponent },
  { path: 'main/orders', component: OrdersStubComponent },
];

async function waitForOneRequest(http: HttpTestingController, url: string): Promise<TestRequest> {
  let req!: TestRequest;
  await vi.waitFor(() => {
    const matched = http.match(url);
    if (matched.length === 1) req = matched[0];
    expect(matched.length).toBe(1);
  });
  return req;
}

describe('Google Sign-In y registro federado (integración)', () => {
  let http: HttpTestingController;
  let router: Router;
  let auth: AuthService;
  let nativePlugin: { [K in keyof GoogleCredentialPlugin]: ReturnType<typeof vi.fn> };
  let gisCallback: ((res: { credential?: string }) => void) | null;
  let initializeSpy: ReturnType<typeof vi.fn>;
  let renderButtonSpy: ReturnType<typeof vi.fn>;
  let disableAutoSelectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gisCallback = null;
    initializeSpy = vi.fn((opts: { callback: (res: { credential?: string }) => void }) => {
      gisCallback = opts.callback;
    });
    renderButtonSpy = vi.fn((parent: HTMLElement) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Google GIS Official';
      parent.appendChild(btn);
    });
    disableAutoSelectSpy = vi.fn();

    (window as unknown as GoogleCredentialWindow).google = {
      accounts: {
        id: {
          initialize: initializeSpy as never,
          renderButton: renderButtonSpy as never,
          disableAutoSelect: disableAutoSelectSpy as never,
        },
      },
    };

    nativePlugin = {
      signIn: vi.fn(),
      clearCredentialState: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideIonicAngular({ animated: false }),
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        { provide: API_BASE_URL, useValue: base },
        { provide: BACKEND_SESSION_ENABLED, useValue: true },
        { provide: GOOGLE_AUTH_AUTO_CONFIG, useValue: true },
        { provide: PUBLIC_CATALOG_ENABLED, useValue: false },
        { provide: GOOGLE_CREDENTIAL_PLUGIN, useValue: nativePlugin },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    try {
      http.match(`${base}/api/public/legal/registration`).forEach((req) => {
        if (!req.cancelled) req.flush({ required: false, termsVersion: '', privacyVersion: '' });
      });
      http.verify();
    } finally {
      delete (window as unknown as GoogleCredentialWindow).google;
      vi.restoreAllMocks();
    }
  });

  async function flushWebButtonMount(purpose: 'AUTH' | 'LINK' | 'REAUTH' = 'AUTH', enabled = true): Promise<string> {
    const cfgReq = await waitForOneRequest(http, `${base}/api/auth/google/config`);
    cfgReq.flush({ success: true, message: 'ok', data: { enabled, webClientId: enabled ? CLIENT_ID : '' } });
    if (!enabled) return '';
    const chReq = await waitForOneRequest(http, `${base}/api/auth/google/challenge`);
    expect(chReq.request.body).toEqual({ purpose });
    const nonce = 'nonce-web-challenge-123456';
    chReq.flush({ success: true, message: 'ok', data: { nonce, expiresInSeconds: 300 } });
    await vi.waitFor(() => expect(renderButtonSpy).toHaveBeenCalled());
    return nonce;
  }

  it('monta GIS en Login y muestra aviso honesto cuando Google no está configurado', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', ConnectedLoginPage);
    await flushWebButtonMount('AUTH', false);

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain('no está configurado');
    });
    expect(renderButtonSpy).not.toHaveBeenCalled();
    expect(auth.hasValidSession()).toBe(false);
  });

  it('conserva exactamente 7 cmc-input en Register tradicional, divide Registro en 2 pasos sin perder datos e integra Google con signup_with', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/register', ConnectedRegisterPage);
    http.expectOne(`${base}/api/public/legal/registration`).flush({ required: false, termsVersion: '', privacyVersion: '' });
    await flushWebButtonMount('AUTH', true);
    harness.detectChanges();

    const root = harness.routeNativeElement!;
    expect(root.querySelectorAll('form cmc-input')).toHaveLength(7);
    expect(root.querySelectorAll('app-google-signin-button')).toHaveLength(1);
    expect(renderButtonSpy).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ text: 'signup_with', locale: 'es' }),
    );

    const chooseView = root.querySelector<HTMLElement>('.register-step-choose')!;
    const formView = root.querySelector<HTMLElement>('.register-step-form')!;
    expect(chooseView.hidden).toBe(false);
    expect(formView.hidden).toBe(true);
    expect(chooseView.textContent).toContain('Recomendado');
    expect(chooseView.textContent).toContain('Registro rápido');

    // Open traditional registration form (Screen 3)
    const openFormBtn = root.querySelector<HTMLButtonElement>('.register-email-option-btn')!;
    openFormBtn.click();
    harness.detectChanges();
    expect(chooseView.hidden).toBe(true);
    expect(formView.hidden).toBe(false);

    // Enter data in form and go back to Screen 2 -> data must be preserved
    const regPage = harness.routeDebugElement?.componentInstance as ConnectedRegisterPage;
    regPage['form'].patchValue({
      username: 'ivan.castillo',
      firstName: 'Ivan',
      lastName: 'Castillo',
      email: 'ivan@castillo.mx',
    });
    const backMethodBtn = root.querySelector<HTMLButtonElement>('.register-back-method-btn')!;
    backMethodBtn.click();
    harness.detectChanges();
    expect(chooseView.hidden).toBe(false);
    expect(formView.hidden).toBe(true);
    expect(regPage['form'].controls.username.value).toBe('ivan.castillo');
    expect(regPage['form'].controls.email.value).toBe('ivan@castillo.mx');

    // Reopen form and click "Prefiero continuar con Google" -> returns to Screen 2 without losing typed data
    openFormBtn.click();
    harness.detectChanges();
    expect(formView.hidden).toBe(false);
    const preferGoogleBtn = root.querySelector<HTMLButtonElement>('.register-prefer-google-btn')!;
    preferGoogleBtn.click();
    harness.detectChanges();
    expect(chooseView.hidden).toBe(false);
    expect(formView.hidden).toBe(true);
    expect(regPage['form'].controls.username.value).toBe('ivan.castillo');
  });

  it('Android Credential Manager envía nonce, soporta cancelación y limpia credenciales en logout', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', ConnectedLoginPage);

    const cfgReq = await waitForOneRequest(http, `${base}/api/auth/google/config`);
    cfgReq.flush({ success: true, message: 'ok', data: { enabled: true, webClientId: CLIENT_ID } });
    await vi.waitFor(() => expect(harness.routeNativeElement?.querySelector('.google-native-btn')).toBeTruthy());

    nativePlugin.signIn.mockResolvedValueOnce({ cancelled: true });
    const nativeBtn = harness.routeNativeElement!.querySelector<HTMLButtonElement>('.google-native-btn')!;
    nativeBtn.click();

    const ch1 = await waitForOneRequest(http, `${base}/api/auth/google/challenge`);
    ch1.flush({ success: true, message: 'ok', data: { nonce: 'android-nonce-0001', expiresInSeconds: 300 } });
    await vi.waitFor(() => expect(harness.routeNativeElement?.textContent).toContain('cancelado'));
    expect(nativePlugin.signIn).toHaveBeenCalledWith({ serverClientId: CLIENT_ID, nonce: 'android-nonce-0001' });

    nativePlugin.signIn.mockResolvedValueOnce({ cancelled: false, idToken: 'header.android.sig' });
    nativeBtn.click();

    const ch2 = await waitForOneRequest(http, `${base}/api/auth/google/challenge`);
    ch2.flush({ success: true, message: 'ok', data: { nonce: 'android-nonce-0002', expiresInSeconds: 300 } });

    const authReq = await waitForOneRequest(http, `${base}/api/auth/google/authenticate`);
    expect(authReq.request.headers.get('X-Client-Platform')).toBe('android');
    authReq.flush({
      success: true,
      message: 'ok',
      data: {
        outcome: 'AUTHENTICATED',
        jwtResponse: {
          accessToken: fakeJwt(),
          refreshToken: 'refresh-android-token-1234567890123456',
          tokenType: 'Bearer',
          user: { ...profileDto(), hasLocalPassword: false, googleLinked: true, roles: ['ROLE_USER'] },
        },
      },
    });
    await vi.waitFor(() => expect(auth.hasValidSession()).toBe(true));

    auth.logout().subscribe();
    const outReq = await waitForOneRequest(http, `${base}/api/auth/logout`);
    outReq.flush({ success: true, message: 'ok' });
    expect(nativePlugin.clearCredentialState).toHaveBeenCalledOnce();
  });

  it('redirige a Completa tu cuenta con claims completos, valida username, legal, reintenta 409 sin perder token y nunca pide contraseña', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login?returnUrl=%2Fmain%2Forders', ConnectedLoginPage);
    const nonce = await flushWebButtonMount('AUTH', true);

    gisCallback!({ credential: 'header.newgoogle.sig' });
    const authReq = await waitForOneRequest(http, `${base}/api/auth/google/authenticate`);
    expect(authReq.request.body).toEqual({ idToken: 'header.newgoogle.sig', nonce });
    authReq.flush({
      success: true,
      message: 'ok',
      data: {
        outcome: 'REGISTRATION_REQUIRED',
        registrationToken: 'reg-token-12345678901234567890',
        profile: {
          email: 'lucia.new@gmail.com',
          emailVerified: true,
          firstName: 'Lucía',
          lastName: 'Castillo',
          pictureUrl: 'https://lh3.googleusercontent.com/a/avatar',
          suggestedUsername: 'lucia.castillo',
        },
        legal: { required: true, termsVersion: 'v2026', privacyVersion: 'v2026' },
      },
    });

    await vi.waitFor(() => expect(router.url).toBe('/complete-account'));
    harness.detectChanges();
    const el = harness.routeNativeElement!;

    expect(el.textContent).toContain('Completa tu cuenta');
    expect(el.textContent).toContain('crearás una cuenta nueva en Casa de Música Castillo');
    expect(el.textContent).toContain('lucia.new@gmail.com');
    expect(el.textContent).toContain('Correo verificado por Google');
    const avatar = el.querySelector<HTMLImageElement>('img.google-profile-avatar');
    expect(avatar?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(el.querySelector('input[type="password"]')).toBeNull();
    expect(el.querySelector('input[type="email"]')).toBeNull();

    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit'));
    harness.detectChanges();
    expect(el.textContent).toContain('Términos y Condiciones');
    http.expectNone(`${base}/api/auth/google/complete-registration`);

    const completePage = harness.routeDebugElement?.componentInstance as CompleteGoogleAccountPage;
    completePage['form'].controls.username.setValue('lucia.libre');
    const checkReq1 = await waitForOneRequest(http, `${base}/api/auth/check-username/lucia.libre`);
    checkReq1.flush({ success: true, message: 'Disponible', data: { available: true } });

    const checkboxes = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(checkboxes.every((cb) => !cb.checked)).toBe(true);
    checkboxes.forEach((cb) => cb.click());
    harness.detectChanges();

    completePage['submit']();
    const firstSubmit = await waitForOneRequest(http, `${base}/api/auth/google/complete-registration`);
    expect(firstSubmit.request.body).toEqual({
      registrationToken: 'reg-token-12345678901234567890',
      username: 'lucia.libre',
      firstName: 'Lucía',
      lastName: 'Castillo',
      legalAcceptance: { termsAccepted: true, privacyRead: true, termsVersion: 'v2026', privacyVersion: 'v2026' },
    });
    firstSubmit.flush(
      { success: false, message: 'Ese nombre de usuario ya está en uso.' },
      { status: 409, statusText: 'Conflict' },
    );
    harness.detectChanges();
    expect(el.textContent).toContain('usuario ya está en uso');
    expect(TestBed.inject(GoogleRegistrationStateService).state()).not.toBeNull();

    completePage['form'].controls.username.setValue('lucia.libre.2');
    const checkReq2 = await waitForOneRequest(http, `${base}/api/auth/check-username/lucia.libre.2`);
    checkReq2.flush({ success: true, message: 'Disponible', data: { available: true } });

    completePage['submit']();
    const secondSubmit = await waitForOneRequest(http, `${base}/api/auth/google/complete-registration`);
    expect(secondSubmit.request.body.registrationToken).toBe('reg-token-12345678901234567890');
    secondSubmit.flush({
      success: true,
      message: 'ok',
      data: {
        outcome: 'AUTHENTICATED',
        jwtResponse: {
          accessToken: fakeJwt(),
          tokenType: 'Bearer',
          user: { ...profileDto(), username: 'lucia.libre.2', email: 'lucia.new@gmail.com', hasLocalPassword: false, googleLinked: true, roles: ['ROLE_USER'] },
        },
      },
    });
    await vi.waitFor(() => expect(router.url).toBe('/main/orders'));
    expect(TestBed.inject(GoogleRegistrationStateService).state()).toBeNull();
  });

  it('completa registro con claims incompletos usando iniciales y detecta entrada directa sin estado temporal', async () => {
    const regState = TestBed.inject(GoogleRegistrationStateService);
    regState.set(
      {
        registrationToken: 'reg-incomplete-12345678901234',
        profile: {
          email: 'sin.nombres@gmail.com',
          emailVerified: true,
          firstName: '',
          lastName: '',
          pictureUrl: null,
          suggestedUsername: 'sin.nombres',
        },
        legal: { required: false, termsVersion: '', privacyVersion: '' },
      },
      '/main/home',
    );

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/complete-account', CompleteGoogleAccountPage);
    harness.detectChanges();
    const el = harness.routeNativeElement!;
    expect(el.querySelector('.google-profile-initials')?.textContent?.trim()).toBe('S');

    const page = harness.routeDebugElement?.componentInstance as CompleteGoogleAccountPage;
    page['submit']();
    harness.detectChanges();
    expect(page['form'].invalid).toBe(true);
    http.expectNone(`${base}/api/auth/google/complete-registration`);

    regState.clear();
    harness.detectChanges();
    expect(el.textContent).toContain('Volver a Iniciar sesión');
  });

  it('rechaza colisión de correo tradicional (409), cuenta deshabilitada (403) y continúa MFA desde Register', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', ConnectedLoginPage);
    await flushWebButtonMount('AUTH', true);

    gisCallback!({ credential: 'header.conflict.sig' });
    harness.detectChanges();
    const req409 = await waitForOneRequest(http, `${base}/api/auth/google/authenticate`);
    req409.flush(
      { success: false, message: 'Inicia sesión con tu correo y contraseña y vincula Google desde Seguridad.' },
      { status: 409, statusText: 'Conflict' },
    );
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('.google-link-guidance')).toBeTruthy();
      expect(harness.routeNativeElement?.textContent).toContain('No pudimos continuar con Google');
      expect(harness.routeNativeElement?.textContent).toContain('vincula Google desde Seguridad de la cuenta');
    });
    // Verify Google button is above the form and guidance card is above the form
    const loginRoot = harness.routeNativeElement!;
    const googleBtnEl = loginRoot.querySelector('app-google-signin-button')!;
    const guidanceEl = loginRoot.querySelector('.google-link-guidance')!;
    const loginFormEl = loginRoot.querySelector('form.auth-form')!;
    expect(googleBtnEl.compareDocumentPosition(loginFormEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(guidanceEl.compareDocumentPosition(loginFormEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('.auth-alert--error')).toBeNull();
    expect(auth.hasValidSession()).toBe(false);

    // Wait for button to re-arm with fresh challenge after 409
    const initCountBeforeRearm1 = initializeSpy.mock.calls.length;
    const rearm1 = await waitForOneRequest(http, `${base}/api/auth/google/challenge`);
    rearm1.flush({ success: true, message: 'ok', data: { nonce: 'nonce-after-409-1234', expiresInSeconds: 300 } });
    await vi.waitFor(() => expect(initializeSpy.mock.calls.length).toBeGreaterThan(initCountBeforeRearm1));

    gisCallback!({ credential: 'header.disabled.sig' });
    harness.detectChanges();
    const req403 = await waitForOneRequest(http, `${base}/api/auth/google/authenticate`);
    req403.flush(
      { success: false, message: 'Tu cuenta se encuentra deshabilitada.' },
      { status: 403, statusText: 'Forbidden' },
    );
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain('deshabilitada');
    });
    expect(harness.routeNativeElement?.textContent).not.toContain('pendiente de activación');

    const initCountBeforeRearm2 = initializeSpy.mock.calls.length;
    const rearm2 = await waitForOneRequest(http, `${base}/api/auth/google/challenge`);
    rearm2.flush({ success: true, message: 'ok', data: { nonce: 'nonce-after-403-1234', expiresInSeconds: 300 } });
    await vi.waitFor(() => expect(initializeSpy.mock.calls.length).toBeGreaterThan(initCountBeforeRearm2));

    // Trigger Google login from Register with 2FA required -> hands off into /login 2FA screen
    // (config is already cached by GoogleIdentityService, so Register only requests a fresh challenge)
    const initCountBeforeReg = initializeSpy.mock.calls.length;
    await harness.navigateByUrl('/register', ConnectedRegisterPage);
    const regChReq = await waitForOneRequest(http, `${base}/api/auth/google/challenge`);
    regChReq.flush({ success: true, message: 'ok', data: { nonce: 'nonce-reg-mfa-1234', expiresInSeconds: 300 } });
    await vi.waitFor(() => expect(initializeSpy.mock.calls.length).toBeGreaterThan(initCountBeforeReg));
    gisCallback!({ credential: 'header.mfa.sig' });
    const mfaAuthReq = await waitForOneRequest(http, `${base}/api/auth/google/authenticate`);
    mfaAuthReq.flush({
      success: true,
      message: 'ok',
      data: {
        outcome: 'TWO_FACTOR_REQUIRED',
        twoFactorRequired: true,
        preAuthChallenge: 'P'.repeat(43),
        availableMethods: { GOOGLE_AUTHENTICATOR: true, EMAIL: false, BACKUP_CODE: false },
        maskedEmail: 'g***@gmail.com',
      },
    });

    await vi.waitFor(() => expect(router.url).toBe('/login'));
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Verificación en dos pasos');

    const loginPage = harness.routeDebugElement?.componentInstance as ConnectedLoginPage;
    loginPage['codeForm'].controls.code.setValue('123456');
    loginPage['verify']();
    const verifyReq = await waitForOneRequest(http, `${base}/api/2fa/verify`);
    verifyReq.flush({
      success: true,
      message: 'ok',
      data: {
        accessToken: fakeJwt(),
        tokenType: 'Bearer',
        user: { ...profileDto(), roles: ['ROLE_USER'], googleLinked: true, hasLocalPassword: false },
      },
    });
    await vi.waitFor(() => expect(router.url).toBe('/main/home'));
    expect(auth.hasValidSession()).toBe(true);
  });

  it('SplashPage restaura sesión acotadamente y navega a /main/home', async () => {
    TestBed.resetTestingModule();
    const persistentStore = {
      persistent: true,
      load: vi.fn().mockResolvedValue(testSession()),
      save: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideIonicAngular({ animated: false }),
        { provide: API_BASE_URL, useValue: base },
        { provide: BACKEND_SESSION_ENABLED, useValue: true },
        { provide: GOOGLE_AUTH_AUTO_CONFIG, useValue: false },
        { provide: SESSION_STORE, useValue: persistentStore },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(SplashPage);
    fixture.detectChanges();
    const meReq = await waitForOneRequest(http, `${base}/api/auth/me`);
    meReq.flush({ ...profileDto(), roles: ['ROLE_USER'] });
    await vi.waitFor(() => expect(auth.hasValidSession()).toBe(true));
    await vi.waitFor(() => expect(navSpy).toHaveBeenCalledWith(['/main/home'], { replaceUrl: true }));
  });

  it('Escenario C en Login y Register guía al usuario sin banner rojo y redirige tras login tradicional a /profile/security', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', ConnectedLoginPage);
    await flushWebButtonMount('AUTH', true);

    gisCallback!({ credential: 'header.tradconflict.sig' });
    harness.detectChanges();
    const req409 = await waitForOneRequest(http, `${base}/api/auth/google/authenticate`);
    req409.flush({ success: false, message: 'Conflicto de cuenta.' }, { status: 409, statusText: 'Conflict' });

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('.google-link-guidance')).toBeTruthy();
    });
    expect(harness.routeNativeElement?.querySelector('.auth-alert--error')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('.google-link-guidance cmc-button')).toBeNull();

    const regState = TestBed.inject(GoogleRegistrationStateService);
    expect(regState.hasActiveLinkIntent()).toBe(true);

    // Re-arm finishes after 409
    const rearm = await waitForOneRequest(http, `${base}/api/auth/google/challenge`);
    rearm.flush({ success: true, message: 'ok', data: { nonce: 'nonce-after-guided-123', expiresInSeconds: 300 } });

    const loginPage = harness.routeDebugElement?.componentInstance as ConnectedLoginPage;
    loginPage['form'].setValue({ email: 'trad@example.com', password: 'TradPassword!2026' });
    loginPage['submit']();

    const loginReq = await waitForOneRequest(http, `${base}/api/auth/login`);
    loginReq.flush({
      success: true,
      message: 'ok',
      data: {
        jwtResponse: {
          accessToken: fakeJwt(),
          tokenType: 'Bearer',
          user: { ...profileDto(), email: 'trad@example.com', hasLocalPassword: true, googleLinked: false, roles: ['ROLE_USER'] },
        },
      },
    });
    await vi.waitFor(() => expect(router.url).toBe('/profile/security'));
    expect(regState.hasActiveLinkIntent()).toBe(true);
    regState.clearLinkIntent();

    // Register 409 guidance navigates cleanly to /login with link intent
    const initBeforeReg = initializeSpy.mock.calls.length;
    await harness.navigateByUrl('/register', ConnectedRegisterPage);
    const regCh = await waitForOneRequest(http, `${base}/api/auth/google/challenge`);
    regCh.flush({ success: true, message: 'ok', data: { nonce: 'nonce-reg-409-1234', expiresInSeconds: 300 } });
    await vi.waitFor(() => expect(initializeSpy.mock.calls.length).toBeGreaterThan(initBeforeReg));

    gisCallback!({ credential: 'header.regconflict.sig' });
    const reg409 = await waitForOneRequest(http, `${base}/api/auth/google/authenticate`);
    reg409.flush({ success: false, message: 'Conflicto de cuenta.' }, { status: 409, statusText: 'Conflict' });

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('.google-link-guidance')).toBeTruthy();
    });
    expect(harness.routeNativeElement?.querySelector('.auth-alert--error')).toBeNull();

    const goToLoginBtn = harness.routeNativeElement!.querySelector<HTMLButtonElement>('.google-link-guidance cmc-button button')!;
    goToLoginBtn.click();
    await vi.waitFor(() => expect(router.url).toBe('/login'));
    expect(regState.hasActiveLinkIntent()).toBe(true);
    const pendingChallenges = http.match(`${base}/api/auth/google/challenge`);
    pendingChallenges.forEach((req) =>
      req.flush({ success: true, message: 'ok', data: { nonce: 'nonce-login-after-reg-1', expiresInSeconds: 300 } }),
    );
  });
});
