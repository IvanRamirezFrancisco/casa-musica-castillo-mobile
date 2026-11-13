import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { throwError } from 'rxjs';
import { PRODUCTION_API_BASE_URL } from '../../../environments/environment-settings';
import { REQUIRES_AUTH } from '../api/api-client.service';

declare const CMC_REVIEWED_COMMERCE: boolean;

export const REVIEWED_COMMERCE = new InjectionToken<boolean>('REVIEWED_COMMERCE', {
  providedIn: 'root',
  factory: () => typeof CMC_REVIEWED_COMMERCE !== 'undefined' && CMC_REVIEWED_COMMERCE,
});

const protectedCommerce = /^\/api\/(?:cart|checkout|orders|wishlist|reviews|payments)(?:\/|$)/;
const reviewedWrites: Record<string, RegExp> = {
  POST: /^\/api\/(?:cart\/items|wishlist)$/,
  PUT: /^\/api\/cart\/items\/[1-9]\d*$/,
  DELETE: /^\/api\/(?:cart\/items|wishlist)\/[1-9]\d*$/,
};

/** Commercial writes require contract acceptance and explicit authorization. */
export const productionCommerceInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method === 'GET' || request.method === 'HEAD') return next(request);
  let target: URL;
  try { target = new URL(request.url); } catch { return next(request); }
  if (target.origin !== PRODUCTION_API_BASE_URL) return next(request);
  let route: string | undefined;
  try { route = decodeURIComponent(target.pathname).replace(/;[^/]*/g, ''); } catch { /* reject malformed paths */ }
  if (route !== undefined && !protectedCommerce.test(route)) return next(request);
  if (route === target.pathname && !target.search && !target.hash && !target.username && !target.password &&
      reviewedWrites[request.method]?.test(route) && request.context.get(REQUIRES_AUTH) && inject(REVIEWED_COMMERCE)) {
    return next(request);
  }
  return throwError(() => new HttpErrorResponse({
    status: 403, url: request.url,
    error: { message: 'La operación comercial todavía no está habilitada.' },
  }));
};
