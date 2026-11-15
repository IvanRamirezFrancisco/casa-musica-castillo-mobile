import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiClientService } from '../api/api-client.service';
import { ApiError } from '../api/api-error';
import { parsePricePreview } from '../api/checkout.validation';
import { parseOrder } from '../api/order.validation';
import type { RealOrder } from '../models/order.model';
import type { PricePreview, PricePreviewInput, RealCheckoutInput } from '../models/real-checkout.model';
import { CheckoutRepository, REAL_CHECKOUT_WRITE_ENABLED } from '../repositories/checkout.repository';

const trimOpt = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * Adaptador HTTP para vista previa de precios (`POST /api/checkout/price-preview`) y confirmación
 * de pedido (`POST /api/checkout`). Separa explícitamente ambos pasos y bloquea la escritura final
 * mientras `REAL_CHECKOUT_WRITE_ENABLED` sea `false`.
 */
@Injectable({ providedIn: 'root' })
export class HttpCheckoutRepository implements CheckoutRepository {
  private readonly api = inject(ApiClientService);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly writeEnabled = inject(REAL_CHECKOUT_WRITE_ENABLED);

  previewPrice(input: PricePreviewInput): Observable<PricePreview> {
    const body = {
      deliveryOption: input.deliveryOption,
      ...(trimOpt(input.state) ? { state: trimOpt(input.state) } : {}),
      ...(trimOpt(input.city) ? { city: trimOpt(input.city) } : {}),
      ...(trimOpt(input.postalCode) ? { postalCode: trimOpt(input.postalCode) } : {}),
    };
    return this.api.post<unknown>('/api/checkout/price-preview', body, { auth: true }).pipe(
      map((raw) => parsePricePreview(raw)),
    );
  }

  submitCheckout(input: RealCheckoutInput): Observable<RealOrder> {
    if (!this.writeEnabled) {
      return throwError(
        () =>
          new ApiError(
            'http',
            403,
            'La confirmación real de pedidos está bloqueada hasta autorizar un entorno aislado de pruebas.',
          ),
      );
    }
    const body = {
      deliveryOption: input.deliveryOption,
      billingAddress: input.billingAddress.trim(),
      paymentMethod: input.paymentMethod,
      ...(trimOpt(input.shippingAddress) ? { shippingAddress: trimOpt(input.shippingAddress) } : {}),
      ...(trimOpt(input.state) ? { state: trimOpt(input.state) } : {}),
      ...(trimOpt(input.city) ? { city: trimOpt(input.city) } : {}),
      ...(trimOpt(input.postalCode) ? { postalCode: trimOpt(input.postalCode) } : {}),
      ...(trimOpt(input.authorizedPersons) ? { authorizedPersons: trimOpt(input.authorizedPersons) } : {}),
      ...(trimOpt(input.notes) ? { notes: trimOpt(input.notes) } : {}),
    };
    return this.api.post<unknown>('/api/checkout', body, { auth: true }).pipe(
      map((raw) => parseOrder(raw, this.baseUrl)),
    );
  }
}
