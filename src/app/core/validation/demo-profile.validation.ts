import { AbstractControl, ValidationErrors } from '@angular/forms';
import { normalizePersonName } from './auth-fields.validation';

/** Nombre completo DEMO de #80 (Tackalay): 3–80; no es el DTO firstName/lastName de registro. */
const DEMO_NAME = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:(?: |-|'|\. )[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*\.?$/;
export function demoFullNameValidator(control: AbstractControl): ValidationErrors | null {
  const value = normalizePersonName(typeof control.value === 'string' ? control.value : '');
  if (!value) return { required: true };
  if (value.length < 3) return { minlength: true };
  if (value.length > 80) return { maxlength: true };
  return DEMO_NAME.test(value) ? null : { pattern: true };
}
