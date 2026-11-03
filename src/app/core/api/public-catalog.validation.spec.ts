import { describe, expect, it } from 'vitest';
import { parseProduct, parseProductPage, parseProducts } from './public-catalog.validation';
import { mapPublicProduct, safeImageUrl } from './public-product.mapper';
import { productDto, productPage } from './public-catalog.testing';

describe('Public contract validation and mapping', () => {
  it('accepts nullable fields and paginated products without leaking extra fields', () => {
    expect(parseProduct(productDto()).stock).toBe(18);
    expect(parseProductPage(productPage()).totalElements).toBe(1);
    expect(parseProducts([])).toEqual([]);
    expect(parseProductPage(productPage([], { number: 99 } )).content).toEqual([]);
  });
  it.each([null, [], {}, 'invalid JSON', { ...productDto(), id: -1 }, { ...productDto(), id: 1.2 },
    { ...productDto(), price: '6500' }, { ...productDto(), price: -1 }, { ...productDto(), price: Infinity },
    { ...productDto(), discountPrice: 7000 }, { ...productDto(), stock: -1 }, { ...productDto(), stock: 1.2 },
    { ...productDto(), images: [{}] }, { ...productDto(), attributes: [{}] }, { ...productDto(), category: {} },
    { ...productDto(), brand: {} }, { ...productDto(), averageRating: 6 }, { ...productDto(), name: ' ' },
  ])('rejects malformed product %#', value => expect(() => parseProduct(value)).toThrow('contrato'));
  it.each([null, {}, productPage([], { size: 0 }), productPage([], { totalPages: 8 }),
    productPage([productDto()], { totalElements: 0 }), productPage([], { number: -1 }),
  ])('rejects invalid page %#', value => expect(() => parseProductPage(value)).toThrow());
  it('rejects one malformed item instead of mixing unknown data with valid products', () => {
    expect(() => parseProducts([productDto(), {}])).toThrow();
  });
  it.each([[18, 'available'], [0, 'unavailable'], [null, 'unknown']] as const)('maps stock %s honestly', (stock, availability) => {
    expect(mapPublicProduct(productDto({ stock }), 'http://localhost:8080').availability).toBe(availability);
  });
  it('preserves a zero discount and distinct original price', () => {
    expect(mapPublicProduct(productDto({ discountPrice: 0 }), 'https://backend.test')).toMatchObject({ price: 0, originalPrice: 6500, source: 'http' });
  });
  it('maps nullable descriptions, category, brand and no discount', () => {
    expect(mapPublicProduct(productDto({ category: null }), 'https://backend.test')).toMatchObject({ description: '', category: 'Sin categoría', brand: 'Sin marca', originalPrice: null });
  });
  it('orders and deduplicates images; falls back from an unsafe cover', () => {
    const result = mapPublicProduct(productDto({ imageUrl: 'javascript:alert(1)', images: [
      { url: '/b.jpg', displayOrder: 2 }, { url: '/a.jpg', displayOrder: 1 }, { url: '/a.jpg', displayOrder: 3 },
    ], attributes: [{ name: 'B', value: '2', displayOrder: 2 }, { name: 'A', value: '1', displayOrder: 1 }] }), 'https://backend.test');
    expect(result.images).toEqual(['https://backend.test/a.jpg', 'https://backend.test/b.jpg']);
    expect(result.imageUrl).toBe(result.images[0]);
    expect(result.attributes[0].name).toBe('A');
  });
  it.each(['javascript:alert(1)', 'data:image/svg+xml,test', 'http://external.test/image.jpg',
    'https://external.test/image.jpg', 'https://user:password@backend.test/a.jpg', '', null])('rejects unsafe or untrusted image %s', value => {
    expect(safeImageUrl(value, 'https://backend.test')).toBeNull();
  });
  it('only permits development HTTP images at the configured backend origin', () => {
    expect(safeImageUrl('/image.jpg', 'http://10.0.2.2:8080')).toBe('http://10.0.2.2:8080/image.jpg');
    expect(safeImageUrl('http://localhost:8080/a', 'http://10.0.2.2:8080')).toBeNull();
    expect(safeImageUrl('/a', 'http://remote.test')).toBeNull();
    expect(safeImageUrl('/a', 'broken')).toBeNull();
  });
});
