import { FormControl } from '@angular/forms';
import { EMAIL_MAX_LENGTH, strictEmailValidator } from './email.validator';

describe('strictEmailValidator', () => {
  const validate = (value: string | null) => strictEmailValidator(new FormControl(value));

  it('acepta correos con dominio completo', () => {
    expect(validate('cliente@casamusica.mx')).toBeNull();
    expect(validate('nombre.apellido+promo@correo.com.mx')).toBeNull();
  });

  it('acepta el correo aunque tenga espacios alrededor', () => {
    expect(validate('  cliente@correo.com  ')).toBeNull();
  });

  it('deja el campo vacío a Validators.required', () => {
    expect(validate('')).toBeNull();
    expect(validate(null)).toBeNull();
  });

  it('marca como requerido un valor solo con espacios', () => {
    expect(validate('    ')).toEqual({ required: true });
  });

  it.each([
    'usuario@correo',
    'usuario@',
    '@correo.com',
    'usuario correo@correo.com',
    'usuario@@correo.com',
    'usuario@correo.c',
    'usuario@correo..com',
  ])('rechaza el formato inválido "%s"', (value) => {
    expect(validate(value)).toEqual({ email: true });
  });

  it(`rechaza correos de más de ${EMAIL_MAX_LENGTH} caracteres`, () => {
    const largo = `${'a'.repeat(EMAIL_MAX_LENGTH)}@correo.com`;
    expect(validate(largo)).toEqual({ email: true });
  });
});
