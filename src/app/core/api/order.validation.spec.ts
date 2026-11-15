import { ApiError } from './api-error';
import { orderDto, orderItemDto, orderPageDto } from './auth.testing';
import { parseOrder, parseOrderPage, parseOrderTimeline } from './order.validation';

const base = 'https://api.example.test';

describe('order.validation', () => {
  it('distingue id numérico, orderNumber y los tres estados independientes', () => {
    const order = parseOrder(orderDto(), base);
    expect([order.id, order.orderNumber, order.userId]).toEqual([42, 'CMC-2026-0042', 7]);
    expect([order.status, order.paymentStatus, order.shippingStatus]).toEqual(['CONFIRMED', 'PAID', 'PREPARING']);
    expect([order.statusLabel, order.paymentStatusLabel, order.shippingStatusLabel]).toEqual(['Confirmada', 'Pagado', 'Preparando Paquete']);
  });

  it('usa etiquetas por defecto, calcula subtotal de partida y normaliza opcionales', () => {
    const order = parseOrder(orderDto({
      orderDate: null, createdAt: '2026-10-27T18:00:00', statusDisplayName: null, paymentStatusDisplayName: '',
      shippingStatusDisplayName: null, shippingLabel: null, totalItems: null, items: [orderItemDto({ productId: null, subtotal: null, productImage: null, productSku: null })],
    }), base);
    expect([order.statusLabel, order.paymentStatusLabel, order.deliveryLabel, order.totalItems]).toEqual(['Confirmada', 'Pagado', 'Por confirmar', 2]);
    expect(order.items[0].subtotal).toBe(13000);
  });

  it.each([
    ['no objeto', null],
    ['id inválido', orderDto({ id: 0 })],
    ['userId inválido', orderDto({ userId: 0 })],
    ['orderNumber con prefijo DEMO-', orderDto({ orderNumber: 'DEMO-123' })],
    ['orderNumber vacío', orderDto({ orderNumber: ' ' })],
    ['estado de pedido desconocido', orderDto({ status: 'UNKNOWN' })],
    ['estado de pago desconocido', orderDto({ paymentStatus: 'UNKNOWN' })],
    ['estado de envío desconocido', orderDto({ shippingStatus: 'UNKNOWN' })],
    ['items no arreglo', orderDto({ items: 'x' })],
    ['item sin id', orderDto({ items: [orderItemDto({ id: 0 })] })],
    ['item con productId inválido', orderDto({ items: [orderItemDto({ productId: 0 })] })],
    ['item con imagen no cadena', orderDto({ items: [orderItemDto({ productImage: 5 })] })],
    ['totalItems negativo', orderDto({ totalItems: -1 })],
    ['sin fecha', orderDto({ orderDate: null, createdAt: null })],
  ])('rechaza pedido incompatible: %s', (_name, body) => {
    expect(() => parseOrder(body, base)).toThrow(ApiError);
  });

  it('valida paginación y eventos de timeline', () => {
    expect(parseOrderPage(orderPageDto(), base).content).toHaveLength(1);
    expect(() => parseOrderPage({ content: [], number: 0, size: 0, totalElements: 0, totalPages: 0, first: true, last: true }, base)).toThrow(ApiError);
    expect(() => parseOrderPage(orderPageDto([orderDto()], { totalElements: 0 }), base)).toThrow(ApiError);

    expect(parseOrderTimeline([{ id: 1, title: 'Pedido creado', description: 'En revisión', createdAt: '2026-10-27T18:00:00', actorLabel: 'Sistema' }]))
      .toEqual([{ id: 1, title: 'Pedido creado', description: 'En revisión', createdAt: '2026-10-27T18:00:00', actorLabel: 'Sistema' }]);
    expect(parseOrderTimeline([{ id: 1, title: 'Ok', description: null, createdAt: '2026-10-27', actorLabel: null }])[0].description).toBe('');
    expect(() => parseOrderTimeline('x')).toThrow(ApiError);
    expect(() => parseOrderTimeline([{ id: 0, title: 'x', createdAt: '2026' }])).toThrow(ApiError);
    expect(() => parseOrderTimeline([{ id: 1, title: 'x', createdAt: '' }])).toThrow(ApiError);
  });
});
