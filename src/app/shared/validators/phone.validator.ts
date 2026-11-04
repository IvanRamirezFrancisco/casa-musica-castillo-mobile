import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Quita espacios y guiones: "555 123-4567" → "5551234567". Úsalo solo con un teléfono ya validado. */
export function normalizePhone(value: string | null | undefined): string {
  return (value ?? '').replace(/[\s-]/g, '');
}

/**
 * Formatos aceptados para un teléfono de México de 10 dígitos (HU-14):
 * - Continuo: `5551234567`.
 * - Agrupado en 3-3-4: `555 123 4567` o `555-123-4567`.
 * - Agrupado en 2-4-4 (lada de 2 dígitos): `55 1234 5678` o `55-1234-5678`.
 * Cada separador es un único espacio o un único guion entre grupos de dígitos.
 */
const MX_PHONE_PATTERNS: readonly RegExp[] = [
  /^\d{10}$/,
  /^\d{3}[ -]\d{3}[ -]\d{4}$/,
  /^\d{2}[ -]\d{4}[ -]\d{4}$/,
];

/**
 * Teléfono de México de 10 dígitos (HU-14). Los espacios al inicio y al final se
 * ignoran. Se rechazan los separadores al inicio, al final, repetidos o dentro de
 * un grupo ("-5551234567", "555--123-4567", "5-5-5-1-2-3-4-5-6-7"), y cualquier otro
 * carácter (letras, +, paréntesis). El campo vacío se deja a `Validators.required`.
 */
export function mxPhoneValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (!value) {
    return null;
  }
  return MX_PHONE_PATTERNS.some((pattern) => pattern.test(value)) ? null : { phone: true };
}
