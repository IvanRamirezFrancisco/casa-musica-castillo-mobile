import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiError } from '../api/api-error';
import { CHALLENGE, fakeJwt, loginSuccessBody, twoFactorBody, userDto } from '../api/auth.testing';
import { HttpAuthRepository } from './http-auth.repository';

describe('HttpAuthRepository', () => {
  let repo: HttpAuthRepository;
  let http: HttpTestingController;
  const base = 'https://api.example.test';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: base },
    ] });
    repo = TestBed.inject(HttpAuthRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('login envía solo email y contraseña a /api/auth/login, sin Authorization ni cookies', () => {
    const next = vi.fn();
    repo.login({ email: ' ana@gmail.com ', password: 'Cl4ve-Segura' }).subscribe(next);
    const req = http.expectOne(`${base}/api/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@gmail.com', password: 'Cl4ve-Segura' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush(loginSuccessBody());
    expect(next.mock.calls[0][0].kind).toBe('authenticated');
  });

  it('login devuelve desafío 2FA cuando el servidor lo solicita', () => {
    const next = vi.fn();
    repo.login({ email: 'a@gmail.com', password: 'x' }).subscribe(next);
    http.expectOne(`${base}/api/auth/login`).flush(twoFactorBody());
    expect(next.mock.calls[0][0]).toEqual({ kind: 'two-factor', challenge: expect.objectContaining({ preAuthChallenge: CHALLENGE }) });
  });

  it.each([401, 429, 500])('propaga HTTP %i como ApiError', (status) => {
    const error = vi.fn();
    repo.login({ email: 'a@gmail.com', password: 'x' }).subscribe({ error });
    http.expectOne(`${base}/api/auth/login`).flush({ success: false, message: 'Credenciales inválidas' }, { status, statusText: 'x' });
    expect(error.mock.calls[0][0]).toBeInstanceOf(ApiError);
    expect(error.mock.calls[0][0].status).toBe(status);
  });

  it('login con respuesta 200 incompatible se trata como error de contrato', () => {
    const error = vi.fn();
    repo.login({ email: 'a@gmail.com', password: 'x' }).subscribe({ error });
    http.expectOne(`${base}/api/auth/login`).flush({ success: true, data: {} });
    expect(error.mock.calls[0][0].kind).toBe('invalid-response');
  });

  it('2FA: envío de código por correo y verificación con el contrato de LoginFactorRequest', () => {
    const sent = vi.fn(); const verified = vi.fn();
    repo.sendTwoFactorEmailCode({ preAuthChallenge: CHALLENGE, methods: ['EMAIL'] }).subscribe(sent);
    const send = http.expectOne(`${base}/api/2fa/send-login-code`);
    expect(send.request.body).toEqual({ preAuthChallenge: CHALLENGE, method: 'EMAIL' });
    send.flush({ success: true, message: 'Código enviado' });
    expect(sent).toHaveBeenCalled();

    repo.verifyTwoFactor({ preAuthChallenge: CHALLENGE, method: 'EMAIL', code: ' 123456 ' }).subscribe(verified);
    const verify = http.expectOne(`${base}/api/2fa/verify`);
    expect(verify.request.body).toEqual({ preAuthChallenge: CHALLENGE, method: 'EMAIL', code: '123456' });
    verify.flush({ success: true, data: { accessToken: fakeJwt(), user: userDto() } });
    expect(verified.mock.calls[0][0].user.id).toBe(7);
  });

  it('registro usa los campos separados del DTO y omite teléfono vacío', () => {
    repo.register({ username: ' ana ', firstName: ' Ana ', lastName: 'Pérez', email: 'ana@gmail.com', password: 'Cl4ve-Segura', phone: ' ' }).subscribe();
    const req = http.expectOne(`${base}/api/auth/register`);
    expect(req.request.body).toEqual({ username: 'ana', firstName: 'Ana', lastName: 'Pérez', email: 'ana@gmail.com', password: 'Cl4ve-Segura' });
    req.flush({ success: true, message: 'ok', data: userDto() });
  });

  it('registro incluye teléfono cuando existe y falla si success es falso', () => {
    const error = vi.fn();
    repo.register({ username: 'ana', firstName: 'Ana', lastName: 'Pérez', email: 'ana@gmail.com', password: 'Cl4ve-Segura', phone: '5512345678' }).subscribe({ error });
    const req = http.expectOne(`${base}/api/auth/register`);
    expect(req.request.body.phone).toBe('5512345678');
    req.flush({ success: false, message: 'x' });
    expect(error.mock.calls[0][0].kind).toBe('invalid-response');
  });

  it('verificación de correo, reenvío y recuperación usan JSON (no parámetros de URL)', () => {
    repo.verifyEmail(' tok-1 ').subscribe();
    const verify = http.expectOne(`${base}/api/auth/verify-email`);
    expect(verify.request.body).toEqual({ token: 'tok-1' });
    verify.flush({ success: true });

    repo.resendVerification(' a@gmail.com ').subscribe();
    const resend = http.expectOne(`${base}/api/auth/resend-verification`);
    expect(resend.request.body).toEqual({ email: 'a@gmail.com' });
    resend.flush({ success: true });

    repo.requestPasswordReset(' a@gmail.com ').subscribe();
    const request = http.expectOne(`${base}/api/auth/password-reset/request`);
    expect(request.request.url).not.toContain('a@gmail.com');
    expect(request.request.body).toEqual({ email: 'a@gmail.com' });
    request.flush({ success: true });

    repo.confirmPasswordReset(' tok ', 'Nu3va-Clave').subscribe();
    const confirm = http.expectOne(`${base}/api/auth/password-reset/confirm`);
    expect(confirm.request.body).toEqual({ token: 'tok', newPassword: 'Nu3va-Clave' });
    confirm.flush({ success: true });
  });

  it('logout marca la petición como autenticada', () => {
    repo.logout().subscribe();
    const req = http.expectOne(`${base}/api/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Sesión cerrada exitosamente' });
  });
});
