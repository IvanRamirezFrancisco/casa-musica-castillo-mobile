const JWT_SHAPE = /^[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*$/;
const MAX_TOKEN_LENGTH = 8192;

/** Comprobación estructural únicamente; la firma solo puede verificarla el servidor. */
export function looksLikeJwt(token: unknown): token is string {
  return typeof token === 'string' && token.length <= MAX_TOKEN_LENGTH && JWT_SHAPE.test(token);
}

/**
 * Lee `exp` (segundos) del payload y lo devuelve en milisegundos. No valida la firma:
 * solo evita enviar un token ya vencido y programar el cierre de sesión. El servidor decide.
 */
export function readJwtExpiry(token: string): number | null {
  if (!looksLikeJwt(token)) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const binary = atob(padded);
    const json = new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    const claims: unknown = JSON.parse(json);
    if (typeof claims !== 'object' || claims === null) return null;
    const exp = (claims as Record<string, unknown>)['exp'];
    return typeof exp === 'number' && Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
  } catch {
    return null;
  }
}
