import { FormControl } from '@angular/forms';
import { mxPhoneValidator, normalizePhone } from './phone.validator';

describe('mxPhoneValidator', () => {
  const validate = (value: string | null) => mxPhoneValidator(new FormControl(value));

  it.each([
    '5551234567',
    '555 123 4567',
    '555-123-4567',
    '555-123 4567',
    '55 1234 5678',
    '55-1234-5678',
    '  555 123 4567  ',
  ])('acepta "%s"', (value) => {
    expect(validate(value)).toBeNull();
  });

  it('deja el campo vacío a Validators.required', () => {
    expect(validate('')).toBeNull();
    expect(validate(null)).toBeNull();
    expect(validate('   ')).toBeNull();
  });

  it.each(['12', '55512345678', '555123456a', '+525551234567', '(555)1234567'])('rechaza "%s"', (value) => {
    expect(validate(value)).toEqual({ phone: true });
  });

  it.each([
    '-5551234567',
    '5551234567-',
    '555--123-4567',
    '555 - 123 - 4567',
    '5-5-5-1-2-3-4-5-6-7',
    '55 51 23 45 67',
    '5551-234567',
    '555 12 34567',
    '---5551234567---',
    '- - -',
  ])('rechaza "%s" por separadores mal colocados o repetidos', (value) => {
    expect(validate(value)).toEqual({ phone: true });
  });

  it('rechaza un valor compuesto solo por separadores', () => {
    expect(validate('----')).toEqual({ phone: true });
    expect(validate('- -')).toEqual({ phone: true });
  });

  it('normaliza el teléfono a solo dígitos', () => {
    expect(normalizePhone(' 555-123 4567 ')).toBe('5551234567');
  });
});
