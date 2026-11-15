export type RealDeliveryOption = 'PICKUP' | 'LOCAL' | 'NATIONAL';

export type RealPaymentMethod =
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'PAYPAL'
  | 'BANK_TRANSFER'
  | 'CASH_ON_DELIVERY'
  | 'MERCADO_PAGO'
  | 'STRIPE';

export interface PricePreviewInput {
  readonly deliveryOption: RealDeliveryOption;
  readonly state?: string;
  readonly city?: string;
  readonly postalCode?: string;
}

export interface PricePreview {
  readonly subtotal: number;
  readonly tax: number;
  readonly shipping: number;
  readonly total: number;
  readonly deliveryMethod: string;
  readonly deliveryLabel: string;
  readonly requiresAddress: boolean;
  readonly requiresQuote: boolean;
  readonly canProceedToPayment: boolean;
  readonly message: string | null;
  readonly contactWhatsapp: string | null;
  readonly contactPhone: string | null;
  readonly quoteMessage: string | null;
  readonly businessHours: string | null;
}

export interface RealCheckoutInput {
  readonly deliveryOption: RealDeliveryOption;
  readonly shippingAddress?: string;
  readonly state?: string;
  readonly city?: string;
  readonly postalCode?: string;
  readonly authorizedPersons?: string;
  readonly billingAddress: string;
  readonly paymentMethod: RealPaymentMethod;
  readonly notes?: string;
}
