import {
  FIELD_MESSAGES, emailError, optionalPhoneError, passwordByteLength, passwordError, passwordsMatch,
  personNameError, resetTokenError, twoFactorCodeError, usernameError, usernameValidator, otpValidator,
} from './auth-fields.validation';
import { FormControl, FormGroup } from '@angular/forms';

describe('auth-fields.validation (restricciones reales de RegisterRequest)', () => {
  it('username: 3-30 y caracteres de /check-username', () => {
    expect(usernameError('')).toBe('required');
    expect(usernameError('ab')).toBe('minlength');
    expect(usernameError('a'.repeat(31))).toBe('maxlength');
    expect(usernameError('ana pérez')).toBe('pattern');
    expect(usernameError(' ana.perez_1-x ')).toBeNull();
  });

  it('nombres: letras con acentos, 2-50, sin separadores en los extremos', () => {
    expect(personNameError(' ')).toBe('required');
    expect(personNameError('A')).toBe('minlength');
    expect(personNameError('a'.repeat(51))).toBe('maxlength');
    expect(personNameError('Ana123')).toBe('pattern');
    expect(personNameError('<script>')).toBe('pattern');
    expect(personNameError("-Ana")).toBe('pattern');
    expect(personNameError("María José O'Brien-Ñúñez")).toBeNull();
  });

  it('email: formato y 100 caracteres', () => {
    expect(emailError('')).toBe('required');
    expect(emailError('x@y')).toBe('pattern');
    expect(emailError(`${'a'.repeat(95)}@gmail.com`)).toBe('maxlength');
    expect(emailError(' ana@gmail.com ')).toBeNull();
  });

  it('contraseña: 8-255, 72 bytes, 3 tipos de caracteres', () => {
    expect(passwordError('')).toBe('required');
    expect(passwordError('Ab1!')).toBe('minlength');
    expect(passwordError('A1!'.repeat(90))).toBe('maxlength');
    expect(passwordError('Aa1!'.repeat(19))).toBe('maxbytes');
    expect(passwordError('ñ'.repeat(40) + 'A1!')).toBe('maxbytes');
    expect(passwordError('soloMinusculas')).toBe('complexity');
    expect(passwordError('Cl4ve-Segura')).toBeNull();
    expect(passwordByteLength('ñ')).toBe(2);
  });

  it('teléfono opcional de 10 dígitos', () => {
    expect(optionalPhoneError('')).toBeNull();
    expect(optionalPhoneError('5512345678')).toBeNull();
    expect(optionalPhoneError('551234')).toBe('pattern');
    expect(optionalPhoneError('55-1234-5678')).toBeNull();
  });

  it('token de restablecimiento y códigos 2FA', () => {
    expect(resetTokenError('')).toBe('required');
    expect(resetTokenError('a b')).toBe('pattern');
    expect(resetTokenError('a'.repeat(513))).toBe('pattern');
    expect(resetTokenError('abc-123_XYZ')).toBeNull();
    expect(twoFactorCodeError('EMAIL', '')).toBe('required');
    expect(twoFactorCodeError('EMAIL', '12345')).toBe('pattern');
    expect(twoFactorCodeError('GOOGLE_AUTHENTICATOR', '123456')).toBeNull();
    expect(twoFactorCodeError('BACKUP_CODE', 'ABCD-EFGH')).toBeNull();
    expect(twoFactorCodeError('BACKUP_CODE', 'x'.repeat(33))).toBe('maxlength');
  });

  it('validadores de formulario y coincidencia de contraseñas', () => {
    expect(usernameValidator(new FormControl('ab'))).toEqual({ minlength: true });
    expect(usernameValidator(new FormControl(null))).toEqual({ required: true });
    expect(otpValidator(() => 'EMAIL')(new FormControl('abc'))).toEqual({ pattern: true });
    const group = new FormGroup({ password: new FormControl('a'), confirmPassword: new FormControl('b') });
    expect(passwordsMatch(group)).toEqual({ passwordMismatch: true });
    group.controls.confirmPassword.setValue('a');
    expect(passwordsMatch(group)).toBeNull();
    expect(passwordsMatch(new FormGroup({}))).toBeNull();
    expect(Object.keys(FIELD_MESSAGES)).toContain('complexity');
  });
});
