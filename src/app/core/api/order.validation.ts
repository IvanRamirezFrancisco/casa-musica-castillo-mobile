import type { PublicPage } from './public-catalog.dto';
import type {
  OrderItem, OrderStatusCode, OrderTimelineEvent, PaymentStatusCode, RealOrder, ShippingStatusCode,
} from '../models/order.model';
import { ApiError } from './api-error';
import { safeImageUrl } from './public-product.mapper';

const ORDER_STATUSES: readonly OrderStatusCode[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
const PAYMENT_STATUSES: readonly PaymentStatusCode[] = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
const SHIPPING_STATUSES: readonly ShippingStatusCode[] = ['PENDING', 'PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'];

export const ORDER_STATUS_DEFAULT_LABEL: Record<OrderStatusCode, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmada', PROCESSING: 'En Proceso', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
};
export const PAYMENT_STATUS_DEFAULT_LABEL: Record<PaymentStatusCode, string> = {
  PENDING: 'Pendiente', PAID: 'Pagado', FAILED: 'Fallido', REFUNDED: 'Reembolsado', PARTIALLY_REFUNDED: 'Parcialmente Reembolsado',
};
export const SHIPPING_STATUS_DEFAULT_LABEL: Record<ShippingStatusCode, string> = {
  PENDING: 'Pendiente de Envío', PREPARING: 'Preparando Paquete', SHIPPED: 'Enviado',
  IN_TRANSIT: 'En Tránsito', DELIVERED: 'Entregado', RETURNED: 'Devuelto',
};

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

function parseItem(value: unknown, base: string): OrderItem {
  if (!object(value) || !id(value['id']) || typeof value['productName'] !== 'string' || !value['productName'].trim()) throw invalid();
  if (!int(value['quantity']) || value['quantity'] < 1 || !money(value['price'])) throw invalid();
  const productId = value['productId'];
  if (productId !== null && productId !== undefined && !id(productId)) throw invalid();
  const image = value['productImage'];
  if (image !== null && image !== undefined && typeof image !== 'string') throw invalid();
  const subtotal = value['subtotal'];
  return {
    id: value['id'],
    productId: typeof productId === 'number' ? productId : null,
    productName: value['productName'],
    productSku: typeof value['productSku'] === 'string' ? value['productSku'] : '',
    productImage: typeof image === 'string' ? safeImageUrl(image, base) : null,
    quantity: value['quantity'],
    price: value['price'],
    subtotal: money(subtotal) ? subtotal : value['price'] * value['quantity'],
  };
}

export function parseOrder(body: unknown, base: string): RealOrder {
  if (!object(body) || !id(body['id']) || !id(body['userId'])) throw invalid();
  const orderNumber = body['orderNumber'];
  if (typeof orderNumber !== 'string' || !orderNumber.trim() || orderNumber.startsWith('DEMO-')) throw invalid();
  const status = body['status'];
  const paymentStatus = body['paymentStatus'];
  const shippingStatus = body['shippingStatus'];
  if (!ORDER_STATUSES.includes(status as OrderStatusCode)) throw invalid();
  if (!PAYMENT_STATUSES.includes(paymentStatus as PaymentStatusCode)) throw invalid();
  if (!SHIPPING_STATUSES.includes(shippingStatus as ShippingStatusCode)) throw invalid();
  const rawItems = body['items'] ?? [];
  if (!Array.isArray(rawItems)) throw invalid();
  const items = rawItems.map((entry) => parseItem(entry, base));
  const totalItems = body['totalItems'];
  if (totalItems !== null && totalItems !== undefined && !int(totalItems)) throw invalid();
  const date = body['orderDate'] ?? body['createdAt'];
  if (typeof date !== 'string' || !date.trim()) throw invalid();
  const label = (raw: unknown, fallback: string): string => (typeof raw === 'string' && raw.trim() ? raw.trim() : fallback);
  return {
    id: body['id'],
    orderNumber: orderNumber.trim(),
    userId: body['userId'],
    orderDate: date,
    status: status as OrderStatusCode,
    statusLabel: label(body['statusDisplayName'], ORDER_STATUS_DEFAULT_LABEL[status as OrderStatusCode]),
    paymentStatus: paymentStatus as PaymentStatusCode,
    paymentStatusLabel: label(body['paymentStatusDisplayName'], PAYMENT_STATUS_DEFAULT_LABEL[paymentStatus as PaymentStatusCode]),
    shippingStatus: shippingStatus as ShippingStatusCode,
    shippingStatusLabel: label(body['shippingStatusDisplayName'], SHIPPING_STATUS_DEFAULT_LABEL[shippingStatus as ShippingStatusCode]),
    deliveryLabel: label(body['shippingLabel'] ?? body['shippingMethod'] ?? body['deliveryType'], 'Por confirmar'),
    subtotal: optMoney(body['subtotal']),
    tax: optMoney(body['tax']),
    shipping: optMoney(body['shipping']),
    discount: optMoney(body['discount']),
    total: optMoney(body['total']),
    totalItems: typeof totalItems === 'number' ? totalItems : items.reduce((sum, item) => sum + item.quantity, 0),
    items,
  };
}

export function parseOrderPage(body: unknown, base: string): PublicPage<RealOrder> {
  if (!object(body) || !int(body['number']) || !int(body['size']) || body['size'] < 1 || body['size'] > 100
      || !int(body['totalElements']) || !int(body['totalPages'])
      || typeof body['first'] !== 'boolean' || typeof body['last'] !== 'boolean'
      || !Array.isArray(body['content'])) throw invalid();
  const content = body['content'].map((entry) => parseOrder(entry, base));
  if (content.length > body['size'] || body['totalElements'] < content.length) throw invalid();
  return {
    content, number: body['number'], size: body['size'], totalElements: body['totalElements'],
    totalPages: body['totalPages'], first: body['first'], last: body['last'],
  };
}

export function parseOrderTimeline(body: unknown): readonly OrderTimelineEvent[] {
  if (!Array.isArray(body)) throw invalid();
  return body.map((entry) => {
    if (!object(entry) || !id(entry['id']) || typeof entry['title'] !== 'string' || !entry['title'].trim()) throw invalid();
    if (typeof entry['createdAt'] !== 'string' || !entry['createdAt'].trim()) throw invalid();
    return {
      id: entry['id'],
      title: entry['title'].trim(),
      description: typeof entry['description'] === 'string' ? entry['description'].trim() : '',
      createdAt: entry['createdAt'],
      actorLabel: typeof entry['actorLabel'] === 'string' ? entry['actorLabel'].trim() : '',
    };
  });
}
