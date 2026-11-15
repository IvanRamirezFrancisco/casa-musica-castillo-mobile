import { HttpClient, HttpContext, HttpContextToken, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from './api-base-url.token';
import { toApiError } from './api-error';

/**
 * Marca explícita de peticiones que requieren el JWT. El interceptor solo adjunta
 * Authorization cuando esta marca es `true`; las rutas públicas nunca reciben el token.
 */
export const REQUIRES_AUTH = new HttpContextToken<boolean>(() => false);

export interface ApiRequestOptions {
  /** Adjunta el JWT de la sesión actual (endpoints autenticados). */
  readonly auth?: boolean;
  readonly params?: HttpParams;
}

type ApiPath = `/api/${string}`;

/** Infraestructura HTTP; los contratos y paths pertenecen a cada repositorio. */
@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');

  get<T>(path: ApiPath, params?: HttpParams, options: Omit<ApiRequestOptions, 'params'> = {}): Observable<T> {
    return this.http.get<T>(this.url(path), this.config(options, params)).pipe(this.mapError());
  }

  post<T>(path: ApiPath, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body, this.config(options, options.params)).pipe(this.mapError());
  }

  put<T>(path: ApiPath, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.put<T>(this.url(path), body, this.config(options, options.params)).pipe(this.mapError());
  }

  delete<T>(path: ApiPath, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.delete<T>(this.url(path), this.config(options, options.params)).pipe(this.mapError());
  }

  private url(path: ApiPath): string {
    return `${this.baseUrl}${path}`;
  }

  private config(options: Omit<ApiRequestOptions, 'params'>, params?: HttpParams) {
    return {
      params,
      timeout: 60_000,
      credentials: 'omit' as const,
      redirect: 'error' as const,
      context: new HttpContext().set(REQUIRES_AUTH, options.auth === true),
    };
  }

  private mapError<T>() {
    return catchError<T, Observable<never>>((error: unknown) => throwError(() => toApiError(error)));
  }
}
