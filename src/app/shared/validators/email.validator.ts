import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Longitud máxima de un correo según RFC 5321. */
export const EMAIL_MAX_LENGTH = 254;

/** Usuario + @ + dominio con al menos un punto y extensión de 2 o más letras. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

/**
 * Validación de correo más estricta que `Validators.email` (TT-16):
 * rechaza correos sin dominio completo (p. ej. `usuario@correo`),
 * correos con espacios y valores mayores a 254 caracteres.
 * Un valor solo con espacios se reporta como `required`.
 */
export function strictEmailValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const raw = control.value ?? '';
  const value = raw.trim();
  if (!value) {
    return raw ? { required: true } : null;
  }
  if (value.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(value)) {
    return { email: true };
  }
  return null;
}
