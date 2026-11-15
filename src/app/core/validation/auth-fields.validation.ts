import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { TwoFactorMethod } from '../models/auth.model';

/**
 * Restricciones del backend (RegisterRequest, ResetPasswordRequest, LoginFactorRequest) replicadas para
 * dar retroalimentación inmediata. El servidor sigue aplicando la política dinámica y sus validaciones adicionales.
 */
export const FIELD_LIMITS = {
  usernameMin: 3, usernameMax: 30, nameMin: 2, nameMax: 50, emailMax: 100,
  passwordMin: 8, passwordMax: 255, passwordMaxBytes: 72, phoneMax: 20, otpLength: 6, backupCodeMax: 32,
} as const;

const USERNAME = /^[A-Za-z0-9._-]+$/;
// Adaptación de las reglas revisadas de Tackalay en #77/#80; límites del contrato Spring.
const PERSON_NAME = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÇç]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÇç]+)*$/;
const EMAIL_LOCAL = /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const TLD = /^[A-Za-z]{2,}$/;
const MX_PHONE = /^(?:[0-9]{10}|[0-9]{3}[ -][0-9]{3}[ -][0-9]{4}|[0-9]{2}[ -][0-9]{4}[ -][0-9]{4})$/;

export const normalizePersonName = (value: string): string => value.trim().replace(/\s+/g, ' ');
/** Aplicar únicamente después de validar el formato; no convierte entradas malformadas en válidas. */
export const normalizePhone = (value: string): string => value.trim().replace(/[ -]/g, '');
const OTP = /^[0-9]{6}$/;
const SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const SIMPLE_PASSWORD = [
  /password|admin123|abc123|123123|321321|654321|fedcba/i,
  /(.)\1{2,}/i,
  /0123|1234|2345|3456|4567|5678|6789|7890|9876|8765|7654|6543|5432|4321|3210/,
  /abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz/i,
  /qwer|wert|erty|rtyu|tyui|yuio|uiop|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm/i,
];

export const passwordByteLength = (value: string): number => new TextEncoder().encode(value).length;

/** Devuelve la clave del primer error o `null` si el valor es aceptable. */
export const usernameError = (value: string): string | null => {
  const v = value.trim();
  if (!v) return 'required';
  if (v.length < FIELD_LIMITS.usernameMin) return 'minlength';
  if (v.length > FIELD_LIMITS.usernameMax) return 'maxlength';
  return USERNAME.test(v) ? null : 'pattern';
};

export const personNameError = (value: string): string | null => {
  const v = normalizePersonName(value);
  if (!v) return 'required';
  if (v.length < FIELD_LIMITS.nameMin) return 'minlength';
  if (v.length > FIELD_LIMITS.nameMax) return 'maxlength';
  if (!PERSON_NAME.test(v)) return 'pattern';
  return null;
};

export const emailError = (value: string): string | null => {
  const v = value.trim();
  if (!v) return 'required';
  if (v.length > FIELD_LIMITS.emailMax) return 'maxlength';
  const parts = v.split('@');
  if (parts.length !== 2) return 'pattern';
  const [local, domain] = parts;
  if (local.length > 64 || !EMAIL_LOCAL.test(local)) return 'pattern';
  const labels = domain.split('.');
  return labels.length >= 2 && TLD.test(labels[labels.length - 1]) &&
    labels.every((label) => label.length <= 63 && DOMAIN_LABEL.test(label)) ? null : 'pattern';
};

export const passwordCharacterTypes = (value: string): number =>
  [/[a-z]/, /[A-Z]/, /[0-9]/, SPECIAL].filter(rule => rule.test(value)).length;

export const passwordError = (value: string): string | null => {
  if (!value) return 'required';
  if (value.length < FIELD_LIMITS.passwordMin) return 'minlength';
  if (value.length > FIELD_LIMITS.passwordMax) return 'maxlength';
  if (passwordByteLength(value) > FIELD_LIMITS.passwordMaxBytes) return 'maxbytes';
  if (/\s/u.test(value)) return 'whitespace';
  if (passwordCharacterTypes(value) < 4) return 'complexity';
  return SIMPLE_PASSWORD.some(pattern => pattern.test(value)) ? 'simplePassword' : null;
};

export const optionalPhoneError = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  return MX_PHONE.test(v) ? null : 'pattern';
};

export const resetTokenError = (value: string): string | null => {
  const v = value.trim();
  if (!v) return 'required';
  return v.length > 512 || /\s/.test(v) ? 'pattern' : null;
};

export const twoFactorCodeError = (method: TwoFactorMethod, value: string): string | null => {
  const v = value.trim();
  if (!v) return 'required';
  if (method === 'BACKUP_CODE') return v.length <= FIELD_LIMITS.backupCodeMax ? null : 'maxlength';
  return OTP.test(v) ? null : 'pattern';
};

const asValidator = (rule: (value: string) => string | null): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const key = rule(typeof control.value === 'string' ? control.value : '');
    return key ? { [key]: true } : null;
  };

export const usernameValidator = asValidator(usernameError);
export const personNameValidator = asValidator(personNameError);
export const emailValidator = asValidator(emailError);
export const passwordValidator = asValidator(passwordError);
export const optionalPhoneValidator = asValidator(optionalPhoneError);
export const requiredPhoneValidator = asValidator((value) => !value.trim() ? 'required' : optionalPhoneError(value));
export const resetTokenValidator = asValidator(resetTokenError);
export const otpValidator = (method: () => TwoFactorMethod): ValidatorFn =>
  asValidator((value) => twoFactorCodeError(method(), value));

export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return typeof password === 'string' && typeof confirm === 'string' && password !== confirm
    ? { passwordMismatch: true } : null;
};

/** Mensaje accesible por clave de error; nunca incluye el valor introducido. */
export const FIELD_MESSAGES: Record<string, string> = {
  required: 'Este campo es obligatorio.',
  minlength: 'El valor es demasiado corto.',
  maxlength: 'El valor es demasiado largo.',
  maxbytes: 'La contraseña es demasiado larga (máximo 72 bytes).',
  complexity: 'Incluye una minúscula, una mayúscula, un número y un símbolo.',
  whitespace: 'La contraseña no debe contener espacios.',
  simplePassword: 'Evita secuencias simples y caracteres repetidos consecutivos.',
  pattern: 'El formato no es válido.',
};
