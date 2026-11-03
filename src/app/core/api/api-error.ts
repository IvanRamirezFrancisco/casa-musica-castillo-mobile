import { HttpErrorResponse } from '@angular/common/http';

/** Longitud máxima de un mensaje de servidor mostrado al usuario. */
const MAX_SERVER_MESSAGE = 200;

export class ApiError extends Error {
  constructor(
    public readonly kind: 'connection' | 'http' | 'invalid-response',
    public readonly status: number,
    /** Mensaje de negocio del backend (solo 4xx), saneado y acotado. Nunca de 5xx. */
    public readonly serverMessage?: string,
    /** Espera sugerida por el servidor en HTTP 429, en segundos. */
    public readonly retryAfterSeconds?: number,
  ) {
    super(kind === 'connection'
      ? 'No se pudo conectar con la API. Revisa red, servidor, CORS o tiempo de espera.'
      : kind === 'invalid-response'
        ? 'La API devolvió una respuesta incompatible con el contrato esperado.'
        : `La API respondió con HTTP ${status}.`);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean { return this.kind === 'http' && this.status === 401; }
  get isForbidden(): boolean { return this.kind === 'http' && this.status === 403; }
  get isNotFound(): boolean { return this.kind === 'http' && this.status === 404; }
}

/** Texto plano sin caracteres de control; descarta lo que no sea cadena útil. */
export function sanitizeServerMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  return clean.length > MAX_SERVER_MESSAGE ? `${clean.slice(0, MAX_SERVER_MESSAGE - 1)}…` : clean;
}

function readBody(body: unknown): { message?: string; retry?: number } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return {};
  const record = body as Record<string, unknown>;
  const retry = record['remainingTimeSeconds'];
  return {
    message: sanitizeServerMessage(record['message']) ?? sanitizeServerMessage(record['error']),
    retry: typeof retry === 'number' && Number.isFinite(retry) && retry >= 0 ? Math.ceil(retry) : undefined,
  };
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return new ApiError('connection', 0);
    // Los cuerpos de error 5xx pueden contener detalles internos: no se propagan.
    const detail = error.status >= 400 && error.status < 500 ? readBody(error.error) : {};
    return new ApiError('http', error.status, detail.message, detail.retry);
  }
  return new ApiError('connection', 0);
}
