import { ApiError } from './api-error';

export type ApiErrorContext = 'generic' | 'auth' | 'form' | 'two-factor';

/**
 * Convierte un error técnico en un mensaje de usuario en español, sin SQL, stack traces ni cuerpos
 * internos. El `serverMessage` (solo 4xx, saneado) se usa únicamente cuando es un mensaje de negocio.
 */
export function describeApiError(error: unknown, context: ApiErrorContext = 'generic'): string {
  if (!(error instanceof ApiError)) return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  if (error.kind === 'connection') {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (error.kind === 'invalid-response') {
    return 'El servidor respondió de forma inesperada. Inténtalo más tarde.';
  }
  if (error.status === 429) {
    const seconds = error.retryAfterSeconds;
    if (seconds && seconds > 0) {
      const minutes = Math.ceil(seconds / 60);
      return `Demasiados intentos. Espera ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} e inténtalo de nuevo.`;
    }
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (error.status === 401) {
    if (context === 'two-factor') return 'Código inválido o vencido. Si agotaste los intentos, inicia sesión de nuevo.';
    if (context === 'auth') return error.serverMessage ?? 'Correo o contraseña incorrectos.';
    return 'Tu sesión expiró. Inicia sesión de nuevo.';
  }
  if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
  if (error.status === 404) return 'No encontramos lo que buscas.';
  if (error.status >= 500) return 'El servidor no pudo procesar la solicitud. Inténtalo más tarde.';
  return error.serverMessage ?? (context === 'form' ? 'Revisa los datos ingresados e inténtalo de nuevo.' : 'No se pudo completar la solicitud.');
}
