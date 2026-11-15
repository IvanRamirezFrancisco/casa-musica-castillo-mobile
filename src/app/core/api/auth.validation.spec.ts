import { ApiError } from './api-error';
import { parseAuthUser, parseLoginResponse, parseTwoFactorVerifyResponse, unwrapApiResponse } from './auth.validation';
import { CHALLENGE, fakeJwt, loginSuccessBody, twoFactorBody, userDto } from './auth.testing';

describe('auth.validation', () => {
  it('login sin 2FA devuelve sesión con expiración tomada del JWT', () => {
    const exp = Math.floor(Date.now() / 1000) + 900;
    const outcome = parseLoginResponse(loginSuccessBody(fakeJwt(exp)));
    expect(outcome.kind).toBe('authenticated');
    if (outcome.kind === 'authenticated') {
      expect(outcome.session.expiresAt).toBe(exp * 1000);
      expect(outcome.session.user).toEqual(expect.objectContaining({ id: 7, firstName: 'Ana', lastName: 'Pérez' }));
    }
  });

  it.each([null, 1, 1e308])('no acepta sesión ilimitada o vencida por exp=%s', exp => {
    const token=fakeJwt(exp);
    expect(()=>parseLoginResponse(loginSuccessBody(token))).toThrow(ApiError);
    expect(()=>parseTwoFactorVerifyResponse({success:true,data:{accessToken:token,user:userDto()}})).toThrow(ApiError);
  });

  it('un desafío 2FA con HTTP 200 NO es una sesión y no contiene token', () => {
    const outcome = parseLoginResponse(twoFactorBody({ EMAIL: true, GOOGLE_AUTHENTICATOR: true, BACKUP_CODE: false }));
    expect(outcome).toEqual({ kind: 'two-factor', challenge: { preAuthChallenge: CHALLENGE, methods: ['EMAIL', 'GOOGLE_AUTHENTICATOR'] } });
    expect(JSON.stringify(outcome)).not.toContain('accessToken');
  });

  it('identifica el contrato anterior sin aceptar el desafío ni crear sesión', () => {
    const legacy = { success: true, data: { twoFactorRequired: true, user: userDto(), availableMethods: { EMAIL: true } } };
    expect(() => parseLoginResponse(legacy)).toThrow(expect.objectContaining({ kind: 'incompatible-mfa', status: 200 }));
  });

  it.each([
    ['success false', { success: false, message: 'x', data: {} }],
    ['sin data', { success: true, message: 'x' }],
    ['sin jwtResponse ni desafío', { success: true, data: { other: true } }],
    ['token ausente', { success: true, data: { jwtResponse: { user: userDto() } } }],
    ['token que no es JWT', { success: true, data: { jwtResponse: { accessToken: 'abc', user: userDto() } } }],
    ['tokenType distinto de Bearer', { success: true, data: { jwtResponse: { accessToken: fakeJwt(), tokenType: 'Basic', user: userDto() } } }],
    ['usuario sin id', { success: true, data: { jwtResponse: { accessToken: fakeJwt(), user: userDto({ id: 0 }) } } }],
    ['desafío con formato inválido', { success: true, data: { twoFactorRequired: true, preAuthChallenge: 'corto', availableMethods: { EMAIL: true } } }],
    ['desafío sin métodos activos', twoFactorBody({ EMAIL: false, GOOGLE_AUTHENTICATOR: false, BACKUP_CODE: false })],
    ['desafío sin availableMethods', { success: true, data: { twoFactorRequired: true, preAuthChallenge: CHALLENGE } }],
    ['cuerpo no objeto', 'ok'],
    ['arreglo', []],
    ['null', null],
  ])('rechaza respuesta incompatible: %s', (_name, body) => {
    expect(() => parseLoginResponse(body)).toThrow(ApiError);
  });

  it('un backup code solo se ofrece cuando el servidor lo declara', () => {
    const outcome = parseLoginResponse(twoFactorBody({ EMAIL: false, GOOGLE_AUTHENTICATOR: false, BACKUP_CODE: true }));
    expect(outcome.kind === 'two-factor' && outcome.challenge.methods).toEqual(['BACKUP_CODE']);
  });

  it('verificación 2FA acepta JwtAuthResponse en data (sin envoltorio jwtResponse)', () => {
    const session = parseTwoFactorVerifyResponse({ success: true, data: { accessToken: fakeJwt(), expiresIn: 3600000, user: userDto() } });
    expect(session.user.email).toBe('ana@gmail.com');
    expect(() => parseTwoFactorVerifyResponse(loginSuccessBody())).toThrow(ApiError);
  });

  it('usuario: normaliza null y rechaza tipos incorrectos', () => {
    expect(parseAuthUser(userDto({ firstName: null, lastName: null, phone: null, roles: undefined, twoFactorEnabled: undefined })))
      .toEqual({ id: 7, email: 'ana@gmail.com', firstName: '', lastName: '', phone: null, roles: [], twoFactorEnabled: false });
    for (const bad of [{ email: 'sin-arroba' }, { firstName: 4 }, { phone: 5 }, { roles: 'ADMIN' }, { roles: [1] }, { twoFactorEnabled: 'si' }, { id: 1.5 }]) {
      expect(() => parseAuthUser(userDto(bad))).toThrow(ApiError);
    }
    expect(() => parseAuthUser(null)).toThrow(ApiError);
  });

  it('unwrapApiResponse exige success verdadero', () => {
    expect(unwrapApiResponse({ success: true })).toEqual({ success: true });
    expect(() => unwrapApiResponse({ success: 'true' })).toThrow(ApiError);
  });
});
