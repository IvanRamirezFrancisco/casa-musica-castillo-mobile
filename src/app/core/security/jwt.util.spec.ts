import { fakeJwt } from '../api/auth.testing';
import { looksLikeJwt, readJwtExpiry, readJwtSubject } from './jwt.util';

describe('jwt.util', () => {
  it('lee exp en milisegundos y tolera payload Unicode', () => {
    expect(readJwtExpiry(fakeJwt(1_900_000_000, { name: 'Pérez ñ' }))).toBe(1_900_000_000_000);
  });

  it('devuelve null sin exp, con exp inválido o con basura', () => {
    expect(readJwtExpiry(fakeJwt(null))).toBeNull();
    expect(readJwtExpiry(fakeJwt(0))).toBeNull();
    expect(readJwtExpiry(fakeJwt(1, { exp: 'x' }))).toBeNull();
    expect(readJwtExpiry('no-es-jwt')).toBeNull();
    expect(readJwtExpiry('aaaa.%%%%.cccc')).toBeNull();
    expect(readJwtExpiry('aaaa.bm90LWpzb24.cccc')).toBeNull();
    expect(readJwtExpiry(`aaaa.${btoa('"texto"').replace(/=+$/, '')}.cccc`)).toBeNull();
  });

  it('valida forma de JWT y longitud', () => {
    expect(looksLikeJwt(fakeJwt())).toBe(true);
    expect(looksLikeJwt('a.b.c')).toBe(false);
    expect(looksLikeJwt(123)).toBe(false);
    expect(looksLikeJwt(`${'a'.repeat(9000)}.bbbb.cccc`)).toBe(false);
  });
  it('lee un sub numérico de Spring y rechaza payloads o identidades inválidas', () => {
    expect(readJwtSubject(fakeJwt())).toBe('7');
    for (const token of ['invalid', 'aaaa.bm90LWpzb24.cccc', fakeJwt(null, { sub: null }),
      `aaaa.${btoa('null').replace(/=+$/, '')}.cccc`]) expect(readJwtSubject(token)).toBeNull();
  });

});
