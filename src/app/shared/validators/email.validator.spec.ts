import { FormControl } from '@angular/forms';
import {
  EMAIL_LABEL_MAX_LENGTH,
  EMAIL_LOCAL_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  strictEmailValidator,
} from './email.validator';

/**
 * Arma un correo válido de exactamente `total` caracteres usando una parte local de 64
 * y etiquetas de dominio de hasta 63, para probar el límite de 254 sin romper otras reglas.
 */
function correoConLongitud(total: number): string {
  const local = 'a'.repeat(EMAIL_LOCAL_MAX_LENGTH);
  const etiquetaLarga = 'b'.repeat(EMAIL_LABEL_MAX_LENGTH);
  const dominio = total - local.length - 1; // 1 = la @
  const ultimaEtiqueta = 'c'.repeat(dominio - (EMAIL_LABEL_MAX_LENGTH * 2 + 2 + 4)); // 2 puntos + ".com"
  const correo = `${local}@${etiquetaLarga}.${etiquetaLarga}.${ultimaEtiqueta}.com`;
  expect(correo.length).toBe(total);
  return correo;
}

describe('strictEmailValidator', () => {
  const validate = (value: string | null) => strictEmailValidator(new FormControl(value));

  it('acepta correos con dominio completo', () => {
    expect(validate('cliente@casamusica.mx')).toBeNull();
    expect(validate('nombre.apellido+promo@correo.com.mx')).toBeNull();
  });

  it.each([
    'a@b.co',
    'usuario_1@correo.com',
    'usuario-1@correo.com',
    'usuario%1@correo.com',
    'u.s.u.a.r.i.o@correo.com',
    'usuario@sub-dominio.correo.com',
    'usuario@correo2.com',
    'USUARIO@CORREO.COM',
    'usuario@xn--espaa-rta.com',
  ])('no rechaza el correo válido "%s"', (value) => {
    expect(validate(value)).toBeNull();
  });

  it('normaliza con trim() los espacios al inicio y al final antes de validar', () => {
    expect(validate('  cliente@correo.com  ')).toBeNull();
  });

  it('rechaza los espacios internos aunque se normalicen los exteriores', () => {
    expect(validate('  cliente @correo.com  ')).toEqual({ email: true });
    expect(validate('cliente@correo .com')).toEqual({ email: true });
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

  it.each([
    '.usuario@dominio.com',
    'usuario..doble@dominio.com',
    'usuario.@dominio.com',
    'usuario@dom_inio.com',
    'usuario@-dominio.com',
  ])('rechaza el formato señalado en la revisión "%s"', (value) => {
    expect(validate(value)).toEqual({ email: true });
  });

  it.each([
    'usuario@dominio-.com',
    'usuario@dominio.-com',
    'usuario@.dominio.com',
    'usuario@dominio.com.',
    'usuario@dominio.c0m',
    'usu!ario@dominio.com',
    'usuaño@dominio.com',
    'usuario@dominío.com',
  ])('rechaza otros formatos inválidos relacionados: "%s"', (value) => {
    expect(validate(value)).toEqual({ email: true });
  });

  describe('límites de longitud', () => {
    it(`acepta un correo de exactamente ${EMAIL_MAX_LENGTH} caracteres`, () => {
      expect(validate(correoConLongitud(EMAIL_MAX_LENGTH))).toBeNull();
    });

    it(`rechaza un correo de ${EMAIL_MAX_LENGTH + 1} caracteres`, () => {
      expect(validate(correoConLongitud(EMAIL_MAX_LENGTH + 1))).toEqual({ email: true });
    });

    it(`rechaza correos de más de ${EMAIL_MAX_LENGTH} caracteres`, () => {
      const largo = `${'a'.repeat(EMAIL_MAX_LENGTH)}@correo.com`;
      expect(validate(largo)).toEqual({ email: true });
    });

    it(`acepta una parte local de ${EMAIL_LOCAL_MAX_LENGTH} caracteres y rechaza una de ${EMAIL_LOCAL_MAX_LENGTH + 1}`, () => {
      expect(validate(`${'a'.repeat(EMAIL_LOCAL_MAX_LENGTH)}@correo.com`)).toBeNull();
      expect(validate(`${'a'.repeat(EMAIL_LOCAL_MAX_LENGTH + 1)}@correo.com`)).toEqual({ email: true });
    });

    it(`acepta una etiqueta de dominio de ${EMAIL_LABEL_MAX_LENGTH} caracteres y rechaza una de ${EMAIL_LABEL_MAX_LENGTH + 1}`, () => {
      expect(validate(`usuario@${'b'.repeat(EMAIL_LABEL_MAX_LENGTH)}.com`)).toBeNull();
      expect(validate(`usuario@${'b'.repeat(EMAIL_LABEL_MAX_LENGTH + 1)}.com`)).toEqual({ email: true });
    });

    it('el recorte de espacios no cuenta para el límite', () => {
      expect(validate(`  ${correoConLongitud(EMAIL_MAX_LENGTH)}  `)).toBeNull();
    });
  });
});
