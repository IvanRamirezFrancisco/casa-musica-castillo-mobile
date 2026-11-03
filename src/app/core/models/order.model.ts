export type OrderStatusCode = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatusCode = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type ShippingStatusCode = 'PENDING' | 'PREPARING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';

export interface OrderItem {
  readonly id: number;
  readonly productId: number | null;
  readonly productName: string;
  readonly productSku: string;
  readonly productImage: string | null;
  readonly quantity: number;
  readonly price: number;
  readonly subtotal: number;
}

/**
 * Pedido real (`OrderDTO`).
 * `id` es el identificador numérico de base de datos (usado en `/api/orders/my/{id}` y `/orders/{id}`).
 * `orderNumber` es el folio comercial visible para el cliente.
 * `status` (pedido), `paymentStatus` (pago) y `shippingStatus` (envío) son tres estados independientes.
 */
export interface RealOrder {
  readonly id: number;
  readonly orderNumber: string;
  readonly userId: number;
  readonly orderDate: string;
  readonly status: OrderStatusCode;
  readonly statusLabel: string;
  readonly paymentStatus: PaymentStatusCode;
  readonly paymentStatusLabel: string;
  readonly shippingStatus: ShippingStatusCode;
  readonly shippingStatusLabel: string;
  readonly deliveryLabel: string;
  readonly subtotal: number;
  readonly tax: number;
  readonly shipping: number;
  readonly discount: number;
  readonly total: number;
  readonly totalItems: number;
  readonly items: readonly OrderItem[];
}

export interface OrderTimelineEvent {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly actorLabel: string;
}
