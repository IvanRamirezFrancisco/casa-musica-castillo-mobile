import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Quita espacios y guiones: "555 123-4567" → "5551234567". */
export function normalizePhone(value: string | null | undefined): string {
  return (value ?? '').replace(/[\s-]/g, '');
}

/**
 * Teléfono de México de 10 dígitos (HU-14). Acepta espacios o guiones como
 * separadores; cualquier otro carácter (letras, +, paréntesis) es inválido.
 * El campo vacío se deja a `Validators.required`.
 */
export function mxPhoneValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const raw = control.value ?? '';
  if (!raw.trim()) {
    return null;
  }
  return /^\d{10}$/.test(normalizePhone(raw)) ? null : { phone: true };
}
