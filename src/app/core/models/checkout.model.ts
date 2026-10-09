export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category: string;
}

export type DeliveryMethodType = 'store' | 'home';
export type PaymentMethodType = 'transfer' | 'mercadopago';

export interface DeliveryMethod {
  type: DeliveryMethodType;
  title: string;
  description: string;
  cost: number;
}

export interface PaymentMethod {
  type: PaymentMethodType;
  title: string;
  description: string;
}

export interface CheckoutSummary {
  subtotal: number;
  shipping: number;
  total: number;
}

export interface DemoOrder {
  id: string;
  items: CartItem[];
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  summary: CheckoutSummary;
  createdAt: Date;
}
