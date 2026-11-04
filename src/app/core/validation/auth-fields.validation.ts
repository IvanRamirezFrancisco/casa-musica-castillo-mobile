import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { TwoFactorMethod } from '../models/auth.model';

/**
 * Restricciones del backend (RegisterRequest, ResetPasswordRequest, LoginFactorRequest) replicadas para
 * dar retroalimentación inmediata. El servidor sigue siendo la autoridad y puede rechazar más casos
 * (p. ej. secuencias como 123/abc/qwerty, dominio de correo no permitido).
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

export const passwordError = (value: string): string | null => {
  if (!value) return 'required';
  if (value.length < FIELD_LIMITS.passwordMin) return 'minlength';
  if (value.length > FIELD_LIMITS.passwordMax) return 'maxlength';
  if (passwordByteLength(value) > FIELD_LIMITS.passwordMaxBytes) return 'maxbytes';
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, SPECIAL].filter((rule) => rule.test(value)).length;
  return classes >= 3 ? null : 'complexity';
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
  complexity: 'Usa al menos 3 tipos: minúsculas, mayúsculas, números o símbolos.',
  pattern: 'El formato no es válido.',
};
