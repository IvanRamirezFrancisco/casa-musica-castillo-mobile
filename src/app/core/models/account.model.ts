export type DemoOrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface DemoOrderItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface DemoAccountOrder {
  id: string;
  date: string;
  status: DemoOrderStatus;
  items: DemoOrderItem[];
  shipping: number;
  deliveryMethod: string;
  paymentMethod: string;
}

export interface DemoUserProfile {
  name: string;
  email: string;
  phone: string;
}
