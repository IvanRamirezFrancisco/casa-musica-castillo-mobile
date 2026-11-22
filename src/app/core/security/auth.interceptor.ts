import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url.token';
import { REQUIRES_AUTH } from '../api/api-client.service';
import { AuthService } from '../services/auth.service';

/**
 * Adjunta el JWT únicamente a peticiones marcadas con `REQUIRES_AUTH` y dirigidas al backend configurado.
 * Si el access token venció o el servidor responde 401 y existe refresh disponible, ejecuta una única
 * renovación serializada (single-flight) antes de reintentar una sola vez o limpiar la sesión.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.context.get(REQUIRES_AUTH)) return next(request);
  const auth = inject(AuthService);
  const base = new URL(inject(API_BASE_URL)).origin;
  let url: URL | undefined;
  try { url = new URL(request.url); } catch { /* absolute API URL required */ }
  if (!url || url.origin !== base || url.username || url.password || !url.pathname.startsWith('/api/')) {
    return throwError(() => new HttpErrorResponse({ status: 0, url: request.url }));
  }

  const executeWithToken = (token: string, allowRetryOn401: boolean): Observable<HttpEvent<unknown>> => {
    const version = auth.sessionVersion;
    return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` }, redirect: 'error' })).pipe(
      map((event) => {
        if (auth.sessionVersion !== version) throw new HttpErrorResponse({ status: 401, url: request.url });
        return event;
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401 && auth.sessionVersion === version) {
          if (allowRetryOn401) {
            const currentValid = auth.validToken();
            if (currentValid && currentValid !== token) {
              return executeWithToken(currentValid, false);
            }
            if (auth.canRefresh()) {
              return from(auth.refreshSession()).pipe(
                switchMap((refreshed) => {
                  const freshToken = refreshed ? auth.validToken() : null;
                  if (freshToken) return executeWithToken(freshToken, false);
                  auth.handleUnauthorized();
                  return throwError(() => error);
                }),
              );
            }
          }
          auth.handleUnauthorized();
        }
        return throwError(() => error);
      }),
    );
  };

  const token = auth.validToken();
  if (!token) {
    if (auth.canRefresh()) {
      return from(auth.refreshSession()).pipe(
        switchMap((refreshed) => {
          const freshToken = refreshed ? auth.validToken() : null;
          if (freshToken) return executeWithToken(freshToken, false);
          auth.handleUnauthorized();
          return throwError(() => new HttpErrorResponse({ status: 401, url: request.url }));
        }),
      );
    }
    auth.handleUnauthorized();
    return throwError(() => new HttpErrorResponse({ status: 401, url: request.url }));
  }

  return executeWithToken(token, true);
};
