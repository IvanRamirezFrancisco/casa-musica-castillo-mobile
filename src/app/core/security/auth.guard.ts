import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BACKEND_SESSION_ENABLED } from '../config/backend-session.token';
import { AuthService } from '../services/auth.service';

/** Acepta solo rutas internas absolutas: evita redirecciones abiertas desde `returnUrl`. */
export function safeReturnUrl(value: unknown, fallback = '/main/home'): string {
  if (typeof value !== 'string' || value.length > 256) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://')) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

/**
 * Protege rutas que dependen de datos del usuario. En la configuración `demo` (flujo ilustrativo)
 * no exige sesión; en modo conectado exige un JWT vigente.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  if (!inject(BACKEND_SESSION_ENABLED)) return true;
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restore();
  if (auth.hasValidSession()) return true;
  if (auth.user() !== null) auth.handleUnauthorized(false);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: safeReturnUrl(state.url) } });
};
