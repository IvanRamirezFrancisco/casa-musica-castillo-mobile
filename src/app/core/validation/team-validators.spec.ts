import { FormControl } from '@angular/forms';
import { emailError, personNameError, optionalPhoneError, normalizePersonName, normalizePhone, requiredPhoneValidator } from './auth-fields.validation';
import { demoFullNameValidator } from './demo-profile.validation';

// Casos revisados de Tackalay (#77/#80), adaptados al contrato real de 100 caracteres.
describe('conciliación #77/#80: correo compartido', () => {
  it.each(['a@b.co', 'usuario_1@correo.com', 'usuario-1@correo.com', 'usuario%1@correo.com',
    'nombre.apellido+promo@correo.com.mx', 'usuario@sub-dominio.correo.com', 'USUARIO@CORREO.COM',
    'usuario@xn--espaa-rta.com', '  cliente@correo.com  '])('acepta %s', (value) => expect(emailError(value)).toBeNull());
  it.each(['.usuario@dominio.com', 'usuario..doble@dominio.com', 'usuario.@dominio.com',
    'usuario@dom_inio.com', 'usuario@-dominio.com', 'usuario@dominio-.com', 'usuario@dominio.-com',
    'usuario@.dominio.com', 'usuario@dominio.com.', 'usuario@dominio.c0m', 'usu!ario@dominio.com',
    'usuaño@dominio.com', 'usuario@dominío.com', 'cliente @correo.com', 'cliente@correo .com',
    'usuario@@correo.com', 'usuario@correo', 'usuario@correo.c', 'usuario@correo..com'])('rechaza %s',
    (value) => expect(emailError(value)).toBe('pattern'));
  it('100 caracteres normalizados; no adopta 254', () => {
    expect(emailError('   ')).toBe('required');
    const exact = 'a'.repeat(64) + '@' + 'b'.repeat(31) + '.com';
    expect(exact.length).toBe(100); expect(emailError('  ' + exact + '  ')).toBeNull();
    expect(emailError(exact.replace('.com', '.comm'))).toBe('maxlength');
  });
  it('límites de parte local y etiquetas independientes del total', () => {
    expect(emailError('a'.repeat(64) + '@correo.com')).toBeNull();
    expect(emailError('a'.repeat(65) + '@correo.com')).toBe('pattern');
    expect(emailError('u@' + 'b'.repeat(63) + '.com')).toBeNull();
    expect(emailError('u@' + 'b'.repeat(64) + '.com')).toBe('pattern');
  });
});

describe('conciliación #80: nombres y teléfonos', () => {
  it.each(["María José O'Brien-Ñúñez", 'Ana  María', 'François', 'Benoît', 'Àngela'])('nombre de registro válido %s',
    (value) => expect(personNameError(value)).toBeNull());
  it.each(["Ana--María", "Ana-'María", "Ana - María", 'Ana...--María', 'Ana.', '-Ana', 'Ana123'])('nombre de registro inválido %s',
    (value) => expect(personNameError(value)).toBe('pattern'));
  it('distingue nombre completo DEMO (3–80, puntos) de campos reales (2–50, sin puntos)', () => {
    expect(demoFullNameValidator(new FormControl('Ana M. López'))).toBeNull();
    expect(demoFullNameValidator(new FormControl('Juan Pérez Jr.'))).toBeNull();
    expect(demoFullNameValidator(new FormControl('Ana...--María'))).toEqual({ pattern: true });
    expect(demoFullNameValidator(new FormControl(' '))).toEqual({ required: true });
    expect(demoFullNameValidator(new FormControl('Al'))).toEqual({ minlength: true });
    expect(demoFullNameValidator(new FormControl('A'.repeat(80)))).toBeNull();
    expect(demoFullNameValidator(new FormControl('A'.repeat(81)))).toEqual({ maxlength: true });
    expect(personNameError('A'.repeat(51))).toBe('maxlength');
    expect(normalizePersonName(' Ana   María ')).toBe('Ana María');
  });
  it.each(['5551234567', '555 123 4567', '555-123-4567', '555-123 4567', '55 1234 5678', '55-1234-5678', ' 555 123 4567 '])('teléfono válido %s',
    (value) => expect(optionalPhoneError(value)).toBeNull());
  it.each(['-5551234567', '5551234567-', '555--123-4567', '555 - 123 - 4567', '5-5-5-1-2-3-4-5-6-7',
    '55 51 23 45 67', '5551-234567', '555 12 34567', '---5551234567---', '+525551234567', '(555)1234567', '555123456a', '55512345678'])('teléfono inválido %s',
    (value) => expect(optionalPhoneError(value)).toBe('pattern'));
  it('obligatorio en perfil DEMO, opcional en registro; normaliza solo formato válido', () => {
    expect(requiredPhoneValidator(new FormControl('  '))).toEqual({ required: true });
    expect(optionalPhoneError('  ')).toBeNull();
    expect(requiredPhoneValidator(new FormControl('55 1234 5678'))).toBeNull();
    expect(normalizePhone(' 55-1234 5678 ')).toBe('5512345678');
  });
});
