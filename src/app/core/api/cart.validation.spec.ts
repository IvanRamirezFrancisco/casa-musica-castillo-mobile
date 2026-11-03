import { ApiError } from './api-error';
import { cartDto, cartItemDto } from './auth.testing';
import { parseCart, parseCartSummary, parseCartValidation } from './cart.validation';

const base = 'https://api.example.test';

describe('cart.validation', () => {
  it('conserva itemId y productId separados y usa los importes del servidor', () => {
    const cart = parseCart(cartDto(), base);
    expect(cart.items[0]).toEqual(expect.objectContaining({ itemId: 50, productId: 313, unitPrice: 6500, subtotal: 13000 }));
    expect([cart.subtotal, cart.tax, cart.total, cart.canCheckout]).toEqual([13000, 2080, 15080, true]);
  });

  it('normaliza campos opcionales y rechaza URLs inseguras', () => {
    const cart = parseCart(cartDto([cartItemDto({ productImage: 'javascript:alert(1)', productSku: null, availableStock: null, available: null, availabilityStatus: null })], { totalItems: null, subtotal: null, tax: null, discount: null, total: null, couponCode: '  ' }), base);
    expect(cart.items[0].productImage).toBeNull();
    expect([cart.totalItems, cart.subtotal, cart.couponCode]).toEqual([2, 0, null]);
  });

  it.each([
    ['no objeto', null],
    ['cartId inválido', cartDto([], { cartId: 0 })],
    ['items no arreglo', { cartId: 1, items: 'x' }],
    ['item sin itemId', cartDto([cartItemDto({ itemId: 0 })])],
    ['item sin productId', cartDto([cartItemDto({ productId: -1 })])],
    ['item sin nombre', cartDto([cartItemDto({ productName: ' ' })])],
    ['cantidad 0', cartDto([cartItemDto({ quantity: 0 })])],
    ['precio negativo', cartDto([cartItemDto({ unitPrice: -1 })])],
    ['stock fraccionario', cartDto([cartItemDto({ availableStock: 1.5 })])],
    ['available no booleano', cartDto([cartItemDto({ available: 'si' })])],
    ['imagen no cadena', cartDto([cartItemDto({ productImage: 5 })])],
    ['totalItems negativo', cartDto([], { totalItems: -1 })],
    ['canCheckout no booleano', cartDto([], { canCheckout: 1 })],
    ['couponCode no cadena', cartDto([], { couponCode: 9 })],
    ['subtotal inválido', cartDto([], { subtotal: 'x' })],
  ])('rechaza carrito incompatible: %s', (_name, body) => {
    expect(() => parseCart(body, base)).toThrow(ApiError);
  });

  it('valida resumen y resultado de /api/cart/validate', () => {
    expect(parseCartSummary({ cartId: null, totalItems: 0, subtotal: 0, total: 0, canCheckout: false, unavailableItemsCount: null, warningMessage: null }))
      .toEqual({ cartId: null, totalItems: 0, subtotal: 0, total: 0, canCheckout: false, unavailableItemsCount: 0, warningMessage: null });
    expect(() => parseCartSummary({ totalItems: -1 })).toThrow(ApiError);
    expect(() => parseCartSummary({ cartId: 0, totalItems: 0 })).toThrow(ApiError);
    expect(() => parseCartSummary({ totalItems: 0, unavailableItemsCount: -1 })).toThrow(ApiError);

    const validation = parseCartValidation({
      valid: false, canCheckout: false, globalErrors: [' Sin stock '],
      itemWarnings: [{ itemId: 50, productId: 313, availabilityStatus: 'OUT', warningMessage: null }],
    });
    expect(validation.globalErrors).toEqual(['Sin stock']);
    expect(validation.itemWarnings[0]).toEqual(expect.objectContaining({ itemId: 50, productId: 313 }));
    expect(() => parseCartValidation({ valid: 'si', canCheckout: false })).toThrow(ApiError);
    expect(() => parseCartValidation({ valid: true, canCheckout: true, globalErrors: [1] })).toThrow(ApiError);
    expect(() => parseCartValidation({ valid: true, canCheckout: true, itemWarnings: [{ itemId: 0, productId: 1 }] })).toThrow(ApiError);
    expect(() => parseCartValidation({ valid: true, canCheckout: true, globalErrors: 'x' })).toThrow(ApiError);
  });
});
