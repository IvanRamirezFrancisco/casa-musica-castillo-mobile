import { AuthSession } from '../models/auth.model';

const encode = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** JWT sintético (sin firma válida) solo para pruebas; nunca se usa en la aplicación. */
export const fakeJwt = (expSeconds: number | null = Math.floor(Date.now() / 1000) + 3600, extra: Record<string, unknown> = {}): string =>
  `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'test@example.test', ...(expSeconds === null ? {} : { exp: expSeconds }), ...extra })}.c2lnbmF0dXJl`;

export const userDto = (patch: Record<string, unknown> = {}) => ({
  id: 7, firstName: 'Ana', lastName: 'Pérez', email: 'ana@gmail.com', phone: '5512345678', enabled: true,
  twoFactorEnabled: false, roles: ['ROLE_CUSTOMER'], ...patch,
});

export const loginSuccessBody = (token = fakeJwt()) => ({
  success: true, message: 'Inicio de sesión exitoso',
  data: { jwtResponse: { accessToken: token, tokenType: 'Bearer', user: userDto() }, sessionManagement: { activeSessions: 1 } },
});

export const CHALLENGE = 'A'.repeat(43);
export const twoFactorBody = (methods: Record<string, boolean> = { EMAIL: true, GOOGLE_AUTHENTICATOR: false, BACKUP_CODE: false }) => ({
  success: true, message: 'Two-factor authentication required',
  data: { twoFactorRequired: true, preAuthChallenge: CHALLENGE, availableMethods: methods },
});

export const testSession = (patch: Partial<AuthSession> = {}): AuthSession => ({
  token: fakeJwt(), expiresAt: Date.now() + 3_600_000,
  user: { id: 7, email: 'ana@gmail.com', firstName: 'Ana', lastName: 'Pérez', phone: null, roles: [], twoFactorEnabled: false },
  ...patch,
});

export const cartItemDto = (patch: Record<string, unknown> = {}) => ({
  itemId: 50, productId: 313, productName: 'Jarana Huasteca', productImage: 'https://res.cloudinary.com/test/a.jpg',
  productSku: 'JARA-008', quantity: 2, unitPrice: 6500, subtotal: 13000, availableStock: 18,
  available: true, availabilityStatus: 'IN_STOCK', warningMessage: null, ...patch,
});

export const cartDto = (items: unknown[] = [cartItemDto()], patch: Record<string, unknown> = {}) => ({
  cartId: 9, items, totalItems: items.length ? 2 : 0, subtotal: 13000, tax: 2080, discount: 0, total: 15080,
  couponCode: null, canCheckout: items.length > 0, warningMessage: null, ...patch,
});

export const orderItemDto = (patch: Record<string, unknown> = {}) => ({
  id: 80, productId: 313, productName: 'Jarana Huasteca', productSku: 'JARA-008',
  productImage: 'https://res.cloudinary.com/test/a.jpg', quantity: 2, price: 6500, subtotal: 13000, ...patch,
});

export const orderDto = (patch: Record<string, unknown> = {}) => ({
  id: 42, orderNumber: 'CMC-2026-0042', userId: 7, orderDate: '2026-10-27T18:00:00',
  status: 'CONFIRMED', statusDisplayName: 'Confirmada',
  paymentStatus: 'PAID', paymentStatusDisplayName: 'Pagado',
  shippingStatus: 'PREPARING', shippingStatusDisplayName: 'Preparando Paquete',
  shippingLabel: 'Envío local', subtotal: 13000, tax: 2080, shipping: 150, discount: 0, total: 15230,
  totalItems: 2, items: [orderItemDto()], ...patch,
});

export const orderPageDto = (content: unknown[] = [orderDto()], patch: Record<string, unknown> = {}) => ({
  content, number: 0, size: 10, totalElements: content.length, totalPages: content.length ? 1 : 0,
  first: true, last: true, ...patch,
});

export const pricePreviewDto = (patch: Record<string, unknown> = {}) => ({
  subtotal: 13000, tax: 2080, shipping: 150, total: 15230,
  deliveryMethod: 'LOCAL', deliveryLabel: 'Envío local en la Huasteca',
  requiresAddress: true, requiresQuote: false, canProceedToPayment: true,
  message: 'Entrega estimada en 24-48 horas.', contactWhatsapp: '7711234567', contactPhone: '7717654321',
  quoteMessage: null, businessHours: 'Lunes a sábado 9:00 a 19:00', ...patch,
});

export const profileDto = (patch: Record<string, unknown> = {}) => ({
  id: 7, email: 'ana@gmail.com', firstName: 'Ana', lastName: 'Pérez', phone: '5512345678',
  enabled: true, twoFactorEnabled: true, googleAuthEnabled: false, emailEnabled: true, backupCodesEnabled: true,
  createdAt: '2026-10-01T10:00:00', updatedAt: '2026-10-20T12:00:00', ...patch,
});
