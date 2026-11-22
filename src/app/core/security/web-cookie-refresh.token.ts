import { InjectionToken } from '@angular/core';

/**
 * Habilita la renovación silenciosa mediante cookie HttpOnly en navegador web conectado.
 * En runtime conectado se provee en `main.ts` cuando no es plataforma nativa; en pruebas inicia en `false`.
 */
export const WEB_COOKIE_REFRESH_ENABLED = new InjectionToken<boolean>('WEB_COOKIE_REFRESH_ENABLED', {
  providedIn: 'root',
  factory: () => false,
});
