import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { PRODUCTION_API_BASE_URL } from '../../../environments/environment-settings';
import { REQUIRES_AUTH } from '../api/api-client.service';
import { PUBLIC_DEMO } from '../config/public-demo.token';

const publicPath = /^\/api\/(?:public\/(?:categories\/active|products\/(?:catalog|featured|latest|[1-9]\d*))|reviews\/product\/[1-9]\d*)$/;

function isPublicApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === PRODUCTION_API_BASE_URL && !url.username && !url.password && publicPath.test(url.pathname);
  } catch {
    return false;
  }
}

export const publicDemoInterceptor: HttpInterceptorFn = (request, next) => {
  if (!inject(PUBLIC_DEMO)) return next(request);

  if (request.method !== 'GET' || request.context.get(REQUIRES_AUTH) || request.headers.has('Authorization')
      || !isPublicApiUrl(request.url)) {
    return throwError(() => new HttpErrorResponse({ status: 403, url: request.url }));
  }
  return next(request.clone({ credentials: 'omit', withCredentials: false, redirect: 'error' }));
};
