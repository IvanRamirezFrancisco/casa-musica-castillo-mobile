import { HttpErrorResponse } from '@angular/common/http';

export class ApiError extends Error {
  constructor(
    public readonly kind: 'connection' | 'http' | 'invalid-response',
    public readonly status: number,
  ) {
    super(kind === 'connection'
      ? 'No se pudo conectar con la API. Revisa red, servidor, CORS o tiempo de espera.'
      : kind === 'invalid-response'
        ? 'La API devolvió una respuesta incompatible con el contrato de categorías.'
        : `La API respondió con HTTP ${status}.`);
    this.name = 'ApiError';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof HttpErrorResponse) {
    return new ApiError(error.status === 0 ? 'connection' : 'http', error.status);
  }
  return new ApiError('connection', 0);
}
