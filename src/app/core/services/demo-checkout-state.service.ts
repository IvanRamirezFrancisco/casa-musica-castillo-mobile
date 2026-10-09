import { Injectable, computed, signal } from '@angular/core';
import { CartItem, DeliveryMethod, PaymentMethod, DemoOrder } from '../models/checkout.model';

@Injectable({
  providedIn: 'root'
})
export class DemoCheckoutStateService {
  // Demo initial items
  private readonly initialItems: CartItem[] = [
    {
      id: 'p1',
      name: 'Guitarra Acústica Yamaha',
      price: 4500,
      quantity: 1,
      category: 'Guitarras'
    },
    {
      id: 'p3',
      name: 'Batería Pearl Export',
      price: 15500,
      quantity: 1,
      category: 'Baterías'
    }
  ];

  cartItems = signal<CartItem[]>(this.initialItems);
  deliveryMethod = signal<DeliveryMethod | null>(null);
  paymentMethod = signal<PaymentMethod | null>(null);

  subtotal = computed(() => {
    return this.cartItems().reduce((acc, item) => acc + (item.price * item.quantity), 0);
  });

  shippingCost = computed(() => {
    return this.deliveryMethod()?.cost || 0;
  });

  total = computed(() => {
    return this.subtotal() + this.shippingCost();
  });

  updateQuantity(id: string, delta: number) {
    this.cartItems.update(items => 
      items.map(item => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  }

  removeItem(id: string) {
    this.cartItems.update(items => items.filter(item => item.id !== id));
  }

  setDeliveryMethod(method: DeliveryMethod) {
    this.deliveryMethod.set(method);
  }

  setPaymentMethod(method: PaymentMethod) {
    this.paymentMethod.set(method);
  }

  clearCheckout() {
    this.cartItems.set([]);
    this.deliveryMethod.set(null);
    this.paymentMethod.set(null);
  }

  placeOrder(): DemoOrder {
    const order: DemoOrder = {
      id: `DEMO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      items: [...this.cartItems()],
      delivery: this.deliveryMethod()!,
      payment: this.paymentMethod()!,
      summary: {
        subtotal: this.subtotal(),
        shipping: this.shippingCost(),
        total: this.total()
      },
      createdAt: new Date()
    };
    return order;
  }
}
