import { Injectable, signal } from '@angular/core';
import { DemoAccountOrder, DemoOrderItem, DemoOrderStatus, DemoUserProfile } from '../models/account.model';

export const ORDER_STATUS_LABEL: Record<DemoOrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_VARIANT: Record<DemoOrderStatus, 'neutral' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  paid: 'success',
  shipped: 'neutral',
  delivered: 'success',
  cancelled: 'error',
};

export const orderSubtotal = (items: DemoOrderItem[]): number =>
  items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

export const orderItemCount = (items: DemoOrderItem[]): number =>
  items.reduce((acc, i) => acc + i.quantity, 0);

/** In-memory demo data only. Nothing is persisted or fetched. */
@Injectable({ providedIn: 'root' })
export class DemoAccountStateService {
  readonly orders = signal<DemoAccountOrder[]>([
    {
      id: 'DEMO-1004',
      date: '2026-09-28',
      status: 'pending',
      items: [{ id: 'p2', name: 'Teclado Roland GO', unitPrice: 7200, quantity: 1 }],
      shipping: 150,
      deliveryMethod: 'Envío a domicilio',
      paymentMethod: 'Transferencia bancaria',
    },
    {
      id: 'DEMO-1003',
      date: '2026-09-20',
      status: 'shipped',
      items: [
        { id: 'p1', name: 'Guitarra Acústica Yamaha', unitPrice: 4500, quantity: 1 },
        { id: 'p4', name: 'Cuerdas para guitarra', unitPrice: 180, quantity: 2 },
      ],
      shipping: 150,
      deliveryMethod: 'Envío a domicilio',
      paymentMethod: 'Mercado Pago',
    },
    {
      id: 'DEMO-1002',
      date: '2026-09-02',
      status: 'delivered',
      items: [{ id: 'p3', name: 'Batería Pearl Export', unitPrice: 15500, quantity: 1 }],
      shipping: 0,
      deliveryMethod: 'Recoger en tienda',
      paymentMethod: 'Mercado Pago',
    },
    {
      id: 'DEMO-1001',
      date: '2026-08-15',
      status: 'cancelled',
      items: [{ id: 'p5', name: 'Atril para partituras', unitPrice: 350, quantity: 1 }],
      shipping: 0,
      deliveryMethod: 'Recoger en tienda',
      paymentMethod: 'Transferencia bancaria',
    },
  ]);

  readonly profile = signal<DemoUserProfile>({
    name: 'Usuario Demo',
    email: 'demo@ejemplo.com',
    phone: '5550000000',
  });

  getOrder(id: string): DemoAccountOrder | undefined {
    return this.orders().find((o) => o.id === id);
  }

  updateProfile(profile: DemoUserProfile): void {
    this.profile.set({ ...profile });
  }
}
