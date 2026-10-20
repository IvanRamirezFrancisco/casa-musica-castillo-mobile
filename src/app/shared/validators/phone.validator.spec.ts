import { FormControl } from '@angular/forms';
import { mxPhoneValidator, normalizePhone } from './phone.validator';

describe('mxPhoneValidator', () => {
  const validate = (value: string | null) => mxPhoneValidator(new FormControl(value));

  it.each(['5551234567', '555 123 4567', '555-123-4567'])('acepta "%s"', (value) => {
    expect(validate(value)).toBeNull();
  });

  it('deja el campo vacío a Validators.required', () => {
    expect(validate('')).toBeNull();
    expect(validate(null)).toBeNull();
  });

  it.each(['12', '55512345678', '555123456a', '+525551234567', '(555)1234567'])('rechaza "%s"', (value) => {
    expect(validate(value)).toEqual({ phone: true });
  });

  it('normaliza el teléfono a solo dígitos', () => {
    expect(normalizePhone(' 555-123 4567 ')).toBe('5551234567');
  });
});
