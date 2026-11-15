import { DEMO_ORDER_REPOSITORY } from '../repositories/demo-order.repository';
import { Injectable, inject, signal } from '@angular/core';
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
  private readonly repository = inject(DEMO_ORDER_REPOSITORY);
  readonly orders = this.repository.orders;

  readonly profile = signal<DemoUserProfile>({
    name: 'Usuario Demo',
    email: 'demo@ejemplo.com',
    phone: '5550000000',
  });

  getOrder(id: string): DemoAccountOrder | undefined {
    return this.repository.findById(id) ?? undefined;
  }

  updateProfile(profile: DemoUserProfile): void {
    this.profile.set({ ...profile });
  }
}
