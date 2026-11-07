import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouteReuseStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { API_BASE_URL } from '../../../core/api/api-base-url.token';
import { CHALLENGE, fakeJwt, loginSuccessBody, twoFactorBody, userDto } from '../../../core/api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../../../core/config/backend-session.token';
import { PUBLIC_CATALOG_ENABLED } from '../../../core/repositories/public-catalog.repository';
import { SESSION_STORE } from '../../../core/security/session-store.token';
import { authGuard } from '../../../core/security/auth.guard';
import { authInterceptor } from '../../../core/security/auth.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { ConnectedLoginPage } from './connected-login.page';
import { ConnectedRegisterPage } from './connected-register.page';
import { ConnectedForgotPasswordPage } from './connected-forgot-password.page';
import { VerifyEmailPage } from './verify-email.page';

@Component({ standalone: true, template: '<p>Destino</p>' })
class DummyTargetComponent {}

const testRoutes = [
  { path: 'login', component: ConnectedLoginPage },
  { path: 'register', component: ConnectedRegisterPage },
  { path: 'forgot-password', component: ConnectedForgotPasswordPage },
  { path: 'verify-email', component: VerifyEmailPage },
  { path: 'main/home', component: DummyTargetComponent },
  { path: 'main/orders', component: DummyTargetComponent, canActivate: [authGuard] },
];

const base = 'https://api.example.test';

describe('autenticación conectada (integración)', () => {
  let http: HttpTestingController;
  let router: Router;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideRouter(testRoutes), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      provideIonicAngular({ animated: false }), { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      { provide: API_BASE_URL, useValue: base }, { provide: BACKEND_SESSION_ENABLED, useValue: true },
      { provide: PUBLIC_CATALOG_ENABLED, useValue: false },
    ] });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => http.verify());

  it('permite Inicio público sin sesión y sin invocar login',async()=>{
    const harness=await RouterTestingHarness.create();await harness.navigateByUrl('/main/home');
    expect(router.url).toBe('/main/home');expect(auth.hasValidSession()).toBe(false);http.expectNone(`${base}/api/auth/login`);
  });

  it('una ruta protegida redirige a login y tras autenticar vuelve al destino original', async () => {
    const harness = await RouterTestingHarness.create();
    const loginComp = await harness.navigateByUrl('/main/orders', ConnectedLoginPage);
    expect(router.url).toBe('/login?returnUrl=%2Fmain%2Forders');

    loginComp['submit']();
    harness.detectChanges();
    http.expectNone(`${base}/api/auth/login`);
    expect(harness.routeNativeElement?.textContent).toContain('Ingresa un correo válido.');

    loginComp['form'].setValue({ email: 'ana@gmail.com', password: 'Cl4ve-Segura' });
    loginComp['submit']();
    loginComp['submit']();
    http.expectOne(`${base}/api/auth/login`).flush(loginSuccessBody());
    await harness.fixture.whenStable();
    expect(loginComp['form'].controls.password.value).toBe('');
    expect(auth.user()?.email).toBe('ana@gmail.com');
    expect(router.url).toBe('/main/orders');
  });

  it('2FA: HTTP 200 con desafío NO autentica hasta completar /api/2fa/verify', () => {
    const page = TestBed.createComponent(ConnectedLoginPage);
    page.detectChanges();
    page.componentInstance['form'].setValue({ email: 'ana@gmail.com', password: 'Cl4ve-Segura' });
    page.componentInstance['submit']();
    http.expectOne(`${base}/api/auth/login`).flush(twoFactorBody({ EMAIL: true, GOOGLE_AUTHENTICATOR: true, BACKUP_CODE: true }));
    page.detectChanges();
    expect(auth.hasValidSession()).toBe(false);
    expect(page.nativeElement.textContent).toContain('Todavía no has iniciado sesión');

    page.componentInstance['sendEmailCode']();
    http.expectOne(`${base}/api/2fa/send-login-code`).flush({ success: true, message: 'ok' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Te enviamos un código');

    page.componentInstance['verify']();
    http.expectNone(`${base}/api/2fa/verify`);
    page.componentInstance['codeForm'].setValue({ code: '123456' });
    page.componentInstance['verify']();
    http.expectOne(`${base}/api/2fa/verify`).flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Código inválido o vencido');
    expect(page.componentInstance['codeForm'].controls.code.value).toBe('');

    page.componentInstance['selectMethod']('BACKUP_CODE');
    page.componentInstance['verify']();
    expect(page.componentInstance['codeError']()).toContain('respaldo');
    page.componentInstance['codeForm'].setValue({ code: 'RESPALDO-1' });
    page.componentInstance['verify']();
    const verify = http.expectOne(`${base}/api/2fa/verify`);
    expect(verify.request.body).toEqual({ preAuthChallenge: CHALLENGE, method: 'BACKUP_CODE', code: 'RESPALDO-1' });
    verify.flush({ success: true, data: { accessToken: fakeJwt(), user: userDto() } });
    expect(auth.hasValidSession()).toBe(true);
  });

  it('2FA: maneja fallo al enviar código y permite cancelar el desafío', () => {
    const page = TestBed.createComponent(ConnectedLoginPage);
    page.detectChanges();
    page.componentInstance['form'].setValue({ email: 'ana@gmail.com', password: 'Cl4ve-Segura' });
    page.componentInstance['submit']();
    http.expectOne(`${base}/api/auth/login`).flush(twoFactorBody({ EMAIL: true, GOOGLE_AUTHENTICATOR: false, BACKUP_CODE: false }));
    page.componentInstance['sendEmailCode']();
    http.expectOne(`${base}/api/2fa/send-login-code`).flush({}, { status: 503, statusText: 'Unavailable' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('El servidor no pudo procesar la solicitud');
    page.componentInstance['cancelSecondFactor']();
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Bienvenido de nuevo');
  });

  it('muestra aviso de sesión expirada y errores 401/429/red sin filtrar secretos en consola', () => {
    const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'info'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
    auth.handleUnauthorized(false);
    const page = TestBed.createComponent(ConnectedLoginPage);
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Tu sesión expiró');

    page.componentInstance['form'].setValue({ email: 'ana@gmail.com', password: 'Secreto-Unico-99!' });
    page.componentInstance['submit']();
    http.expectOne(`${base}/api/auth/login`).flush({ message: 'Bloqueada', remainingTimeSeconds: 120 }, { status: 429, statusText: 'Too Many' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Espera 2 minutos');

    page.componentInstance['submit']();
    http.expectOne(`${base}/api/auth/login`).error(new ProgressEvent('error'));
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('No se pudo conectar');

    for (const spy of logs) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain('Secreto-Unico-99!');
      spy.mockRestore();
    }
  });

  it('registro: valida campos separados de RegisterRequest, envía JSON y no inicia sesión', () => {
    const page = TestBed.createComponent(ConnectedRegisterPage);
    page.detectChanges();
    page.componentInstance['submit']();
    http.expectNone(`${base}/api/auth/register`);
    expect(page.componentInstance['fieldError']('username')).toContain('obligatorio');
    page.componentInstance['form'].controls.username.setValue('a b');
    expect(page.componentInstance['fieldError']('username')).toContain('letras, números');
    page.componentInstance['form'].controls.email.setValue('malo');
    expect(page.componentInstance['fieldError']('email')).toContain('correo válido');
    page.componentInstance['form'].controls.phone.setValue('123');
    expect(page.componentInstance['fieldError']('phone')).toContain('10 dígitos');

    page.componentInstance['form'].setValue({
      username: 'ana_perez', firstName: 'Ana', lastName: 'Pérez',
      email: 'ana@gmail.com', phone: '5512345678', password: 'Cl4ve-Segura', confirmPassword: 'otra',
    });
    expect(page.componentInstance['confirmError']()).toContain('no coinciden');
    page.componentInstance['form'].controls.confirmPassword.setValue('Cl4ve-Segura');

    page.componentInstance['submit']();
    http.expectOne(`${base}/api/auth/register`).flush({ success: false, message: 'No se pudo completar la solicitud' }, { status: 400, statusText: 'Bad Request' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('No se pudo completar la solicitud');

    page.componentInstance['submit']();
    const req = http.expectOne(`${base}/api/auth/register`);
    expect(req.request.body).toEqual({
      username: 'ana_perez', firstName: 'Ana', lastName: 'Pérez',
      email: 'ana@gmail.com', phone: '5512345678', password: 'Cl4ve-Segura',
    });
    req.flush({ success: true, message: 'ok', data: userDto() });
    page.detectChanges();
    expect(auth.user()).toBeNull();
    expect(page.componentInstance['form'].controls.password.value).toBe('');
    expect(page.nativeElement.textContent).toContain('Debes verificarla antes de iniciar sesión');
    page.componentInstance['goBack']();
  });

  it('recuperación y restablecimiento: usa /password-reset/* y limpia contraseñas al terminar o fallar', () => {
    const page = TestBed.createComponent(ConnectedForgotPasswordPage);
    page.detectChanges();
    page.componentInstance['request']();
    expect(page.componentInstance['emailError']()).toContain('correo válido');

    page.componentInstance['requestForm'].setValue({ email: 'ana@gmail.com' });
    page.componentInstance['request']();
    http.expectOne(`${base}/api/auth/password-reset/request`).flush({ success: false }, { status: 429, statusText: 'Too Many' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Demasiados intentos');

    page.componentInstance['request']();
    http.expectOne(`${base}/api/auth/password-reset/request`).flush({ success: true, message: 'ok' });
    page.detectChanges();

    page.componentInstance['confirm']();
    expect(page.componentInstance['tokenError']()).toContain('código completo');
    expect(page.componentInstance['passwordError']()).toContain('obligatorio');
    page.componentInstance['confirmForm'].setValue({ token: 'tok-reset', password: 'Nu3va-Clave', confirmPassword: 'x' });
    expect(page.componentInstance['confirmError']()).toContain('no coinciden');
    page.componentInstance['confirmForm'].controls.confirmPassword.setValue('Nu3va-Clave');

    page.componentInstance['confirm']();
    http.expectOne(`${base}/api/auth/password-reset/confirm`).flush({ success: false, message: 'Token inválido' }, { status: 400, statusText: 'Bad Request' });
    expect(page.componentInstance['confirmForm'].controls.password.value).toBe('');

    page.componentInstance['confirmForm'].setValue({ token: 'tok-reset', password: 'Nu3va-Clave', confirmPassword: 'Nu3va-Clave' });
    page.componentInstance['confirm']();
    http.expectOne(`${base}/api/auth/password-reset/confirm`).flush({ success: true, message: 'ok' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Contraseña actualizada');
    page.componentInstance['goBackToLogin']();
  });

  it('verificación de correo y reenvío de código', () => {
    const page = TestBed.createComponent(VerifyEmailPage);
    page.detectChanges();
    page.componentInstance['verify']();
    expect(page.componentInstance['tokenError']()).toContain('código');

    page.componentInstance['showResend'].set(true);
    page.detectChanges();
    page.componentInstance['resend']();
    expect(page.componentInstance['emailError']()).toContain('correo');
    page.componentInstance['resendForm'].setValue({ email: 'ana@gmail.com' });
    page.componentInstance['resend']();
    http.expectOne(`${base}/api/auth/resend-verification`).flush({}, { status: 500, statusText: 'Error' });
    page.componentInstance['resend']();
    http.expectOne(`${base}/api/auth/resend-verification`).flush({ success: true, message: 'ok' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('enviamos un nuevo código');

    page.componentInstance['form'].setValue({ token: 'tok-email' });
    page.componentInstance['verify']();
    http.expectOne(`${base}/api/auth/verify-email`).flush({ success: false, message: 'Expirado' }, { status: 400, statusText: 'Bad Request' });
    page.componentInstance['verify']();
    http.expectOne(`${base}/api/auth/verify-email`).flush({ success: true, message: 'ok' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Cuenta verificada');
    page.componentInstance['goBackToLogin']();
  });
  it('un fallo nativo de persistencia impide entrar y muestra un aviso accesible sin detalles privados', async () => {
    TestBed.resetTestingModule();
    const broken = { persistent: true, load: vi.fn().mockResolvedValue(null), clear: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockRejectedValue(new Error('private-device-details')) };
    TestBed.configureTestingModule({ providers: [
      provideRouter(testRoutes), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      provideIonicAngular({ animated: false }), { provide: API_BASE_URL, useValue: base },
      { provide: BACKEND_SESSION_ENABLED, useValue: true }, { provide: SESSION_STORE, useValue: broken },
    ] });
    http = TestBed.inject(HttpTestingController); auth = TestBed.inject(AuthService); router = TestBed.inject(Router);
    const page = TestBed.createComponent(ConnectedLoginPage); page.detectChanges();
    page.componentInstance['form'].setValue({ email: 'ana@gmail.com', password: 'Cl4ve-Segura' });
    page.componentInstance['submit'](); http.expectOne(`${base}/api/auth/login`).flush(loginSuccessBody());
    await vi.waitFor(() => expect(auth.storageFailure()).toBe(true)); page.detectChanges();
    const alerts = Array.from(page.nativeElement.querySelectorAll('[role="alert"]') as NodeListOf<HTMLElement>);
    expect(alerts.some(a => a.textContent?.includes('almacenamiento seguro'))).toBe(true);
    expect(page.nativeElement.textContent).not.toContain('private-device-details');
    expect(auth.user()).toBeNull(); expect(router.url).not.toBe('/main/home');
  });

});
