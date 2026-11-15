import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { ApiError } from './api-error';
import { isPublicCategory } from './public-category.model';

@Injectable({ providedIn: 'root' })
export class ApiConnectivityService {
  private readonly api = inject(ApiClientService);

  /** Una lectura explícita por suscripción; no se ejecuta al iniciar la app. */
  check(): Observable<number> {
    return this.api.get<unknown>('/api/public/categories/active').pipe(
      map((body) => {
        if (!Array.isArray(body) || !body.every(isPublicCategory)) {
          throw new ApiError('invalid-response', 200);
        }
        return body.length;
      }),
    );
  }
}
