import { ApiError } from './api-error';
import { describeApiError } from './api-error-message';

describe('describeApiError', () => {
  it('cubre errores no ApiError, red, contrato, 401/403/404/429/5xx y 4xx genérico', () => {
    expect(describeApiError('x')).toContain('inesperado');
    expect(describeApiError(new ApiError('connection', 0))).toContain('No se pudo conectar');
    expect(describeApiError(new ApiError('invalid-response', 200))).toContain('inesperada');
    expect(describeApiError(new ApiError('http', 429, undefined, 30))).toContain('1 minuto');
    expect(describeApiError(new ApiError('http', 429))).toContain('Demasiados intentos');
    expect(describeApiError(new ApiError('http', 401), 'generic')).toContain('sesión expiró');
    expect(describeApiError(new ApiError('http', 401), 'auth')).toContain('incorrectos');
    expect(describeApiError(new ApiError('http', 401), 'two-factor')).toContain('Código inválido');
    expect(describeApiError(new ApiError('http', 403))).toContain('permiso');
    expect(describeApiError(new ApiError('http', 404))).toContain('encontramos');
    expect(describeApiError(new ApiError('http', 502))).toContain('no pudo procesar');
    expect(describeApiError(new ApiError('http', 400), 'generic')).toContain('No se pudo completar');
    expect(describeApiError(new ApiError('http', 400), 'form')).toContain('Revisa los datos');
    expect(describeApiError(new ApiError('http', 400, 'Mensaje del servidor'), 'form')).toBe('Mensaje del servidor');
  });
});
