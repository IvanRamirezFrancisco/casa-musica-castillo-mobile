import { ApiError } from './api-error';
import { profileDto } from './auth.testing';
import { parseUserProfile } from './profile.validation';

describe('profile.validation', () => {
  it('valida el sobre ApiResponse y mapea nombre, apellido, correo, teléfono y estado 2FA', () => {
    const profile = parseUserProfile({ success: true, message: 'ok', data: profileDto() });
    expect([profile.id, profile.firstName, profile.lastName, profile.fullName, profile.email]).toEqual([
      7,
      'Ana',
      'Pérez',
      'Ana Pérez',
      'ana@gmail.com',
    ]);
    expect([profile.enabled, profile.twoFactorEnabled, profile.emailTwoFactorEnabled, profile.totpEnabled, profile.backupCodesEnabled]).toEqual([
      true,
      true,
      true,
      false,
      true,
    ]);
  });

  it('normaliza campos opcionales nulos o ausentes', () => {
    const profile = parseUserProfile({
      success: true,
      data: profileDto({
        phone: '  ',
        enabled: undefined,
        twoFactorEnabled: null,
        emailEnabled: undefined,
        googleAuthEnabled: null,
        backupCodesEnabled: null,
        createdAt: null,
        updatedAt: undefined,
      }),
    });
    expect([profile.phone, profile.enabled, profile.twoFactorEnabled, profile.createdAt, profile.updatedAt]).toEqual([
      null,
      true,
      false,
      null,
      null,
    ]);
  });

  it.each([
    ['no objeto', null],
    ['success false', { success: false, data: profileDto() }],
    ['data ausente', { success: true, data: null }],
    ['id inválido', { success: true, data: profileDto({ id: 0 }) }],
    ['firstName vacío', { success: true, data: profileDto({ firstName: ' ' }) }],
    ['lastName vacío', { success: true, data: profileDto({ lastName: '' }) }],
    ['email inválido', { success: true, data: profileDto({ email: 'sin-arroba' }) }],
    ['phone no cadena', { success: true, data: profileDto({ phone: 123 }) }],
    ['twoFactorEnabled no booleano', { success: true, data: profileDto({ twoFactorEnabled: 'si' }) }],
  ])('rechaza perfil incompatible: %s', (_name, body) => {
    expect(() => parseUserProfile(body)).toThrow(ApiError);
  });
});
