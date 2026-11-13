import { InjectionToken, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PUBLIC_DEMO } from './public-demo.token';

/**
 * Elección explícita de presentación/autenticación, nunca modificada por fallos HTTP.
 * `true`: autenticación, carrito, pedidos y perfil usan Spring Boot.
 * `false`: catálogo público de solo lectura o flujo ilustrativo de la Actividad 4.
 * Se resuelve en tiempo de compilación desde `environment`.
 */
export const BACKEND_SESSION_ENABLED = new InjectionToken<boolean>('BACKEND_SESSION_ENABLED', {
  providedIn: 'root',
  factory: () => environment.publicCatalogEnabled && !inject(PUBLIC_DEMO),
});
