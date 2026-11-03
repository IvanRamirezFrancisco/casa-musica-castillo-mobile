import { Injectable, computed, signal, inject } from '@angular/core';
import { CartItem, DeliveryMethod, PaymentMethod, DemoOrder } from '../models/checkout.model';
import { DemoOrderFactory } from '../factories/demo-order.factory';
import { DEMO_ORDER_REPOSITORY } from '../repositories/demo-order.repository';
import { DemoCatalogService } from './demo-catalog.service';

@Injectable({
  providedIn: 'root'
})
export class DemoCheckoutStateService {
  private readonly factory = inject(DemoOrderFactory);
  private readonly repository = inject(DEMO_ORDER_REPOSITORY);
  private readonly catalog = inject(DemoCatalogService);
  private completed: { key: string; order: DemoOrder } | null = null;

  /** Catalog IDs use their own namespace; legacy sample p1/p3 retain their original prices. */
  addProduct(productId: number): void {
    const product = this.catalog.findById(String(productId));
    if (!product) throw new Error('Producto DEMO no disponible.');
    const id = `catalog-${product.id}`;
    const current = this.cartItems().find(item => item.id === id);
    if (current) this.updateQuantity(id, 1);
    else this.cartItems.update(items => [...items, {
      id, name: product.nombre, category: product.categoria, price: product.precio, quantity: 1,
    }]);
    this.completed = null;
  }

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

  /** Total de unidades en el carrito; alimenta el indicador de la navegación (TT-36). */
  itemCount = computed(() => {
    return this.cartItems().reduce((acc, item) => acc + item.quantity, 0);
  });

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
    if (!Number.isSafeInteger(delta)) return;
    this.completed = null;
    this.cartItems.update(items => 
      items.map(item => {
        if (item.id === id) {
          const sum = item.quantity + delta;
          const newQty = Number.isSafeInteger(sum) ? Math.max(1, sum) : item.quantity;
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  }

  removeItem(id: string) {
    this.completed = null;
    this.cartItems.update(items => items.filter(item => item.id !== id));
  }

  setDeliveryMethod(method: DeliveryMethod) {
    this.completed = null;
    this.deliveryMethod.set(method);
  }

  setPaymentMethod(method: PaymentMethod) {
    this.completed = null;
    this.paymentMethod.set(method);
  }

  clearCheckout() {
    this.completed = null;
    this.cartItems.set([]);
    this.deliveryMethod.set(null);
    this.paymentMethod.set(null);
  }

  placeOrder(): DemoOrder {
    const key = JSON.stringify([this.cartItems(), this.deliveryMethod(), this.paymentMethod()]);
    if (this.completed?.key === key) return structuredClone(this.completed.order);
    const order = this.factory.create(this.cartItems(), this.deliveryMethod(), this.paymentMethod());
    this.repository.add(this.factory.toHistory(order));
    this.completed = { key, order: structuredClone(order) };
    return order;
  }
}
