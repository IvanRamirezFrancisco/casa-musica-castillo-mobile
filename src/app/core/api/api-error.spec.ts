import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, sanitizeServerMessage, toApiError } from './api-error';

describe('ApiError y toApiError', () => {
  it('conserva los mensajes técnicos existentes y no inventa detalle', () => {
    expect(new ApiError('connection', 0).message).toContain('No se pudo conectar con la API');
    expect(new ApiError('http', 503).message).toBe('La API respondió con HTTP 503.');
    expect(new ApiError('invalid-response', 200).message).toContain('incompatible');
  });

  it('expone el mensaje de negocio de 4xx saneado (message o error) y la espera de 429', () => {
    const message = toApiError(new HttpErrorResponse({ status: 400, error: { success: false, message: '  Cuenta\nno verificada  ' } }));
    expect(message.serverMessage).toBe('Cuenta no verificada');
    expect(toApiError(new HttpErrorResponse({ status: 400, error: { error: 'Stock insuficiente' } })).serverMessage).toBe('Stock insuficiente');
    const limited = toApiError(new HttpErrorResponse({ status: 429, error: { message: 'Bloqueada', remainingTimeSeconds: 61.2 } }));
    expect([limited.status, limited.retryAfterSeconds]).toEqual([429, 62]);
  });

  it('nunca propaga cuerpos de 5xx ni cuerpos no objeto', () => {
    expect(toApiError(new HttpErrorResponse({ status: 500, error: { message: 'SQL: select * from users' } })).serverMessage).toBeUndefined();
    expect(toApiError(new HttpErrorResponse({ status: 400, error: '<html>' })).serverMessage).toBeUndefined();
    expect(toApiError(new HttpErrorResponse({ status: 400, error: ['x'] })).serverMessage).toBeUndefined();
    expect(toApiError(new HttpErrorResponse({ status: 429, error: { remainingTimeSeconds: -1 } })).retryAfterSeconds).toBeUndefined();
  });

  it('clasifica 401/403/404 y los errores de red', () => {
    const a = toApiError(new HttpErrorResponse({ status: 401 }));
    const b = toApiError(new HttpErrorResponse({ status: 403 }));
    const c = toApiError(new HttpErrorResponse({ status: 404 }));
    expect([a.isUnauthorized, b.isForbidden, c.isNotFound]).toEqual([true, true, true]);
    expect([a.isForbidden, b.isUnauthorized, c.isUnauthorized]).toEqual([false, false, false]);
    expect(toApiError(new HttpErrorResponse({ status: 0 })).kind).toBe('connection');
    expect(toApiError(new Error('x')).kind).toBe('connection');
    const existing = new ApiError('invalid-response', 200);
    expect(toApiError(existing)).toBe(existing);
  });

  it('sanea y acota textos de servidor', () => {
    expect(sanitizeServerMessage('a'.repeat(300))).toHaveLength(200);
    expect(sanitizeServerMessage('   ')).toBeUndefined();
    expect(sanitizeServerMessage(5)).toBeUndefined();
    expect(sanitizeServerMessage('a\u0007b')).toBe('a b');
  });
});
