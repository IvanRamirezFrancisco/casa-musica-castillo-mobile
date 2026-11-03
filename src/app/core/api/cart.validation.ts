import type { Cart, CartItem, CartSummary, CartValidation } from '../models/cart.model';
import { ApiError, sanitizeServerMessage } from './api-error';
import { safeImageUrl } from './public-product.mapper';

const invalid = () => new ApiError('invalid-response', 200);
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const id = (v: unknown): v is number => int(v) && v > 0;
const money = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER / 100;
const optMoney = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  if (!money(v)) throw invalid();
  return v;
};

function parseItem(value: unknown, base: string): CartItem {
  if (!object(value) || !id(value['itemId']) || !id(value['productId'])) throw invalid();
  if (typeof value['productName'] !== 'string' || !value['productName'].trim()) throw invalid();
  if (!int(value['quantity']) || value['quantity'] < 1) throw invalid();
  if (!money(value['unitPrice']) || !money(value['subtotal'])) throw invalid();
  const stock = value['availableStock'];
  if (stock !== null && stock !== undefined && !int(stock)) throw invalid();
  const available = value['available'];
  if (available !== null && available !== undefined && typeof available !== 'boolean') throw invalid();
  const image = value['productImage'];
  if (image !== null && image !== undefined && typeof image !== 'string') throw invalid();
  return {
    itemId: value['itemId'],
    productId: value['productId'],
    productName: value['productName'],
    productImage: typeof image === 'string' ? safeImageUrl(image, base) : null,
    productSku: typeof value['productSku'] === 'string' ? value['productSku'] : '',
    quantity: value['quantity'],
    unitPrice: value['unitPrice'],
    subtotal: value['subtotal'],
    availableStock: typeof stock === 'number' ? stock : null,
    available: available !== false,
    availabilityStatus: typeof value['availabilityStatus'] === 'string' ? value['availabilityStatus'] : '',
    warningMessage: sanitizeServerMessage(value['warningMessage']) ?? null,
  };
}

export function parseCart(body: unknown, base: string): Cart {
  if (!object(body) || !id(body['cartId']) || !Array.isArray(body['items'])) throw invalid();
  const items = body['items'].map((entry) => parseItem(entry, base));
  const totalItems = body['totalItems'];
  if (totalItems !== null && totalItems !== undefined && !int(totalItems)) throw invalid();
  const canCheckout = body['canCheckout'];
  if (canCheckout !== null && canCheckout !== undefined && typeof canCheckout !== 'boolean') throw invalid();
  const coupon = body['couponCode'];
  if (coupon !== null && coupon !== undefined && typeof coupon !== 'string') throw invalid();
  return {
    cartId: body['cartId'],
    items,
    totalItems: typeof totalItems === 'number' ? totalItems : items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: optMoney(body['subtotal']),
    tax: optMoney(body['tax']),
    discount: optMoney(body['discount']),
    total: optMoney(body['total']),
    couponCode: typeof coupon === 'string' && coupon.trim() ? coupon.trim() : null,
    canCheckout: canCheckout === true && items.length > 0,
    warningMessage: sanitizeServerMessage(body['warningMessage']) ?? null,
  };
}

export function parseCartSummary(body: unknown): CartSummary {
  if (!object(body) || !int(body['totalItems'])) throw invalid();
  const cartId = body['cartId'];
  if (cartId !== null && cartId !== undefined && !id(cartId)) throw invalid();
  const unavailable = body['unavailableItemsCount'];
  if (unavailable !== null && unavailable !== undefined && !int(unavailable)) throw invalid();
  return {
    cartId: typeof cartId === 'number' ? cartId : null,
    totalItems: body['totalItems'],
    subtotal: optMoney(body['subtotal']),
    total: optMoney(body['total']),
    canCheckout: body['canCheckout'] === true,
    unavailableItemsCount: typeof unavailable === 'number' ? unavailable : 0,
    warningMessage: sanitizeServerMessage(body['warningMessage']) ?? null,
  };
}

export function parseCartValidation(body: unknown): CartValidation {
  if (!object(body) || typeof body['valid'] !== 'boolean' || typeof body['canCheckout'] !== 'boolean') throw invalid();
  const globalRaw = body['globalErrors'] ?? [];
  const itemRaw = body['itemWarnings'] ?? [];
  if (!Array.isArray(globalRaw) || !Array.isArray(itemRaw)) throw invalid();
  const globalErrors = globalRaw.map((entry) => {
    if (typeof entry !== 'string') throw invalid();
    return sanitizeServerMessage(entry) ?? '';
  }).filter(Boolean);
  const itemWarnings = itemRaw.map((entry) => {
    if (!object(entry) || !id(entry['itemId']) || !id(entry['productId'])) throw invalid();
    return {
      itemId: entry['itemId'],
      productId: entry['productId'],
      availabilityStatus: typeof entry['availabilityStatus'] === 'string' ? entry['availabilityStatus'] : '',
      warningMessage: sanitizeServerMessage(entry['warningMessage']) ?? 'Revisa la disponibilidad de este producto.',
    };
  });
  return { valid: body['valid'], canCheckout: body['canCheckout'], globalErrors, itemWarnings };
}
