import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Longitud máxima de un correo según RFC 5321. */
export const EMAIL_MAX_LENGTH = 254;

/** Longitud máxima de la parte local (antes de la @) según RFC 5321. */
export const EMAIL_LOCAL_MAX_LENGTH = 64;

/** Longitud máxima de cada etiqueta del dominio (texto entre puntos) según RFC 1035. */
export const EMAIL_LABEL_MAX_LENGTH = 63;

/**
 * Parte local: grupos de caracteres permitidos separados por un solo punto.
 * El conjunto de caracteres coincide con el que acepta el backend (letras, dígitos, `_`, `%`, `+`, `-`),
 * de modo que no se aprueba en pantalla un correo que el servidor rechazaría.
 * Al exigir al menos un carácter entre puntos se rechazan `.usuario@`, `usuario.@` y `usuario..doble@`.
 */
const LOCAL_PATTERN = /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*$/;

/** Etiqueta de dominio: letras o dígitos, con guiones solo en el interior (sin `_`, sin `-` al inicio ni al final). */
const DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

/** Extensión final del dominio: al menos 2 letras. */
const TLD_PATTERN = /^[A-Za-z]{2,}$/;

/** Indica si el texto (ya recortado) cumple el formato de correo estricto. */
function isStrictEmail(value: string): boolean {
  if (value.length > EMAIL_MAX_LENGTH) {
    return false;
  }

  const at = value.indexOf('@');
  if (at < 1 || value.indexOf('@', at + 1) !== -1) {
    return false;
  }

  const local = value.slice(0, at);
  if (local.length > EMAIL_LOCAL_MAX_LENGTH || !LOCAL_PATTERN.test(local)) {
    return false;
  }

  const labels = value.slice(at + 1).split('.');
  if (labels.length < 2) {
    return false;
  }

  const tld = labels[labels.length - 1];
  return (
    TLD_PATTERN.test(tld) &&
    labels.every((label) => label.length <= EMAIL_LABEL_MAX_LENGTH && DOMAIN_LABEL_PATTERN.test(label))
  );
}

/**
 * Validación de correo más estricta que `Validators.email` (TT-16).
 *
 * - Los espacios al inicio y al final se ignoran: el valor se normaliza con
 *   `trim()` antes de validar.
 * - Se rechazan los espacios internos, los correos sin dominio completo
 *   (p. ej. `usuario@correo`) y los valores de más de 254 caracteres.
 * - Se rechazan puntos al inicio, al final o consecutivos en la parte local
 *   (`.usuario@`, `usuario.@`, `usuario..doble@`) y guiones bajos o guiones
 *   en los extremos de una etiqueta del dominio (`usuario@dom_inio.com`,
 *   `usuario@-dominio.com`).
 * - Un valor compuesto solo por espacios se reporta como `required`.
 */
export function strictEmailValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const raw = control.value ?? '';
  const value = raw.trim();
  if (!value) {
    return raw ? { required: true } : null;
  }
  return isStrictEmail(value) ? null : { email: true };
}
