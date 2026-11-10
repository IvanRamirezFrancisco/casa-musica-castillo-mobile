import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { PRODUCTION_API_BASE_URL } from '../../../environments/environment-settings';

const protectedCommerce = /^\/api\/(?:cart|checkout|orders|wishlist|reviews|payments)(?:\/|$)/;

/** Commercial writes require contract acceptance and explicit authorization. */
export const productionCommerceInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method === 'GET' || request.method === 'HEAD') return next(request);
  let target: URL;
  try { target = new URL(request.url); } catch { return next(request); }
  if (target.origin !== PRODUCTION_API_BASE_URL || !protectedCommerce.test(target.pathname)) return next(request);
  return throwError(() => new HttpErrorResponse({
    status: 403, url: request.url,
    error: { message: 'La operación comercial todavía no está habilitada.' },
  }));
};
