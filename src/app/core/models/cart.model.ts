export const CART_LIMITS = { minQuantity: 1, maxQuantity: 100 } as const;

/**
 * Partida real del carrito (`CartItemResponse`).
 * `itemId` es el ID de la partida en el carrito (se usa en PUT/DELETE `/api/cart/items/{itemId}`).
 * `productId` es el ID del producto del catálogo (se usa en POST `/api/cart/items` y en el enlace al detalle).
 * NUNCA son intercambiables.
 */
export interface CartItem {
  readonly itemId: number;
  readonly productId: number;
  readonly productName: string;
  readonly productImage: string | null;
  readonly productSku: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly subtotal: number;
  readonly availableStock: number | null;
  readonly available: boolean;
  readonly availabilityStatus: string;
  readonly warningMessage: string | null;
}

/**
 * Carrito real (`CartResponse`). Todos los importes (`subtotal`, `tax`, `discount`, `total`) los calcula
 * y autoriza Spring Boot; el cliente nunca los recalcula con precios locales ni DEMO.
 */
export interface Cart {
  readonly cartId: number;
  readonly items: readonly CartItem[];
  readonly totalItems: number;
  readonly subtotal: number;
  readonly tax: number;
  readonly discount: number;
  readonly total: number;
  readonly couponCode: string | null;
  readonly canCheckout: boolean;
  readonly warningMessage: string | null;
}

/** Resumen de `/api/cart/summary`. */
export interface CartSummary {
  readonly cartId: number | null;
  readonly totalItems: number;
  readonly subtotal: number;
  readonly total: number;
  readonly canCheckout: boolean;
  readonly unavailableItemsCount: number;
  readonly warningMessage: string | null;
}

export interface CartItemWarning {
  readonly itemId: number;
  readonly productId: number;
  readonly availabilityStatus: string;
  readonly warningMessage: string;
}

/** Resultado de `GET /api/cart/validate`. */
export interface CartValidation {
  readonly valid: boolean;
  readonly canCheckout: boolean;
  readonly globalErrors: readonly string[];
  readonly itemWarnings: readonly CartItemWarning[];
}
