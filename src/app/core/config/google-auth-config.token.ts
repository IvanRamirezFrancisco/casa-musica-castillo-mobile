import { InjectionToken } from '@angular/core';

/**
 * Controla si los botones de Google consultan `/api/auth/google/config` automáticamente al montarse.
 * En runtime conectado se provee en `main.ts` desde `BACKEND_SESSION_ENABLED`; en pruebas inicia en `false`.
 */
export const GOOGLE_AUTH_AUTO_CONFIG = new InjectionToken<boolean>('GOOGLE_AUTH_AUTO_CONFIG', {
  providedIn: 'root',
  factory: () => false,
});
