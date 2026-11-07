import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url.token';
import { REQUIRES_AUTH } from '../api/api-client.service';
import { AuthService } from '../services/auth.service';

/**
 * Adjunta el JWT únicamente a peticiones marcadas con `REQUIRES_AUTH` y dirigidas al backend configurado.
 * Un token vencido no se envía: se trata como 401 local. Ante un 401 del servidor se limpia la sesión;
 * un 403 (autorización) se propaga sin cerrar la sesión.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.context.get(REQUIRES_AUTH)) return next(request);
  const auth = inject(AuthService);
  const base = inject(API_BASE_URL).replace(/\/+$/, '');
  if (!request.url.startsWith(`${base}/`)) {
    return throwError(() => new HttpErrorResponse({ status: 0, url: request.url }));
  }
  const token = auth.validToken();
  if (!token) {
    auth.handleUnauthorized();
    return throwError(() => new HttpErrorResponse({ status: 401, url: request.url }));
  }
  const version = auth.sessionVersion;
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    map((event) => {
      if (auth.sessionVersion !== version) throw new HttpErrorResponse({ status: 401, url: request.url });
      return event;
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.sessionVersion === version) auth.handleUnauthorized();
      return throwError(() => error);
    }),
  );
};
