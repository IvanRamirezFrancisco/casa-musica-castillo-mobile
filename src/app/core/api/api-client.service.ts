import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from './api-base-url.token';
import { toApiError } from './api-error';

/** Infraestructura GET; los contratos y paths pertenecen a cada consumidor. */
@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');

  get<T>(path: `/api/${string}`, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      params,
      timeout: 60_000,
      credentials: 'omit',
    }).pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }
}
