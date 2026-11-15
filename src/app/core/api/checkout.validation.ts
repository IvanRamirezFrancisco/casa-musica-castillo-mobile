import type { PricePreview } from '../models/real-checkout.model';
import { ApiError } from './api-error';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const invalid = (): ApiError => new ApiError('invalid-response', 200);

const readMoney = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw invalid();
  return value;
};

const readBool = (value: unknown): boolean => {
  if (typeof value !== 'boolean') throw invalid();
  return value;
};

const readOptString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw invalid();
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

/** Valida `PricePreviewResponse` de `POST /api/checkout/price-preview`. */
export const parsePricePreview = (body: unknown): PricePreview => {
  if (!isRecord(body)) throw invalid();
  const deliveryMethod = readOptString(body['deliveryMethod']);
  if (!deliveryMethod) throw invalid();
  const deliveryLabel = readOptString(body['deliveryLabel']) ?? deliveryMethod;
  return {
    subtotal: readMoney(body['subtotal']),
    tax: readMoney(body['tax']),
    shipping: readMoney(body['shipping']),
    total: readMoney(body['total']),
    deliveryMethod,
    deliveryLabel,
    requiresAddress: readBool(body['requiresAddress']),
    requiresQuote: readBool(body['requiresQuote']),
    canProceedToPayment: readBool(body['canProceedToPayment']),
    message: readOptString(body['message']),
    contactWhatsapp: readOptString(body['contactWhatsapp']),
    contactPhone: readOptString(body['contactPhone']),
    quoteMessage: readOptString(body['quoteMessage']),
    businessHours: readOptString(body['businessHours']),
  };
};
