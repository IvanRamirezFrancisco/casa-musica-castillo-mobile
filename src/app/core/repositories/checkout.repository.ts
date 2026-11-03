import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpCheckoutRepository } from '../infrastructure/http-checkout.repository';
import type { RealOrder } from '../models/order.model';
import type { PricePreview, PricePreviewInput, RealCheckoutInput } from '../models/real-checkout.model';

/**
 * Guardia de seguridad para `POST /api/checkout`. Permanece en `false` por defecto para impedir
 * compras accidentales sobre producción o entornos compartidos sin autorización explícita.
 */
export const REAL_CHECKOUT_WRITE_ENABLED = new InjectionToken<boolean>('REAL_CHECKOUT_WRITE_ENABLED', {
  providedIn: 'root',
  factory: () => false,
});

export interface CheckoutRepository {
  previewPrice(input: PricePreviewInput): Observable<PricePreview>;
  submitCheckout(input: RealCheckoutInput): Observable<RealOrder>;
}

export const CHECKOUT_REPOSITORY = new InjectionToken<CheckoutRepository>('CHECKOUT_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(HttpCheckoutRepository),
});
