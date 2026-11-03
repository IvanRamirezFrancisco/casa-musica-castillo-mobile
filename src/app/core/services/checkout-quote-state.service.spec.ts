import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ApiError } from '../api/api-error';
import { pricePreviewDto } from '../api/auth.testing';
import { parsePricePreview } from '../api/checkout.validation';
import type { PricePreview } from '../models/real-checkout.model';
import { CHECKOUT_REPOSITORY } from '../repositories/checkout.repository';
import { AuthService } from './auth.service';
import { CheckoutQuoteStateService } from './checkout-quote-state.service';

describe('CheckoutQuoteStateService (estado de presentación por vista)', () => {
  const sessionEnded = new Subject<void>();
  const previewPrice = vi.fn();
  let state: CheckoutQuoteStateService;
  beforeEach(() => {
    previewPrice.mockReset();
    TestBed.configureTestingModule({ providers: [CheckoutQuoteStateService,
      { provide: CHECKOUT_REPOSITORY, useValue: { previewPrice } },
      { provide: AuthService, useValue: { sessionEnded$: sessionEnded } },
    ] });
    state = TestBed.inject(CheckoutQuoteStateService);
  });

  it('cancela la cotización previa e ignora una respuesta obsoleta', () => {
    const pickup = new Subject<PricePreview>();
    const local = new Subject<PricePreview>();
    previewPrice.mockReturnValueOnce(pickup).mockReturnValueOnce(local);
    state.load({ deliveryOption: 'PICKUP' });
    expect(state.loading()).toBe(true);
    state.load({ deliveryOption: 'LOCAL', city: 'Huejutla' });
    expect(pickup.observed).toBe(false);
    local.next(parsePricePreview(pricePreviewDto()));
    pickup.next(parsePricePreview(pricePreviewDto({ total: 1 })));
    expect(state.quote()?.total).toBe(15230);
    expect(state.loading()).toBe(false);
  });

  it('invalida importes y cancela solicitudes al terminar la sesión', () => {
    const response = new Subject<PricePreview>();
    previewPrice.mockReturnValue(response);
    state.load({ deliveryOption: 'PICKUP' });
    sessionEnded.next();
    expect(response.observed).toBe(false);
    expect([state.quote(), state.loading(), state.error()]).toEqual([null, false, '']);
    response.next(parsePricePreview(pricePreviewDto()));
    expect(state.quote()).toBeNull();
  });

  it('descarta una cotización lista al editar su destino', () => {
    previewPrice.mockReturnValue(of(parsePricePreview(pricePreviewDto())));
    state.load({ deliveryOption: 'LOCAL' });
    expect(state.quote()).not.toBeNull();
    state.invalidate();
    expect(state.quote()).toBeNull();
  });

  it.each([
    ['invalid-response', 200, 'respondió de forma inesperada'],
    ['http', 401, 'Tu sesión expiró'],
    ['http', 403, 'No tienes permiso'],
    ['connection', 0, 'No se pudo conectar'],
    ['http', 500, 'El servidor no pudo procesar'],
  ] as const)('distingue %s/%s sin inventar importes', (kind, status, message) => {
    previewPrice.mockReturnValue(throwError(() => new ApiError(kind, status)));
    state.load({ deliveryOption: 'PICKUP' });
    expect(state.quote()).toBeNull();
    expect(state.loading()).toBe(false);
    expect(state.error()).toContain(message);
  });

  it('permite reintentar después de una excepción síncrona del adaptador', () => {
    previewPrice.mockImplementationOnce(() => { throw new Error('private diagnostic'); });
    state.load({ deliveryOption: 'PICKUP' });
    expect(state.error()).not.toContain('private diagnostic');
    previewPrice.mockReturnValue(of(parsePricePreview(pricePreviewDto())));
    state.load({ deliveryOption: 'LOCAL' });
    expect(state.quote()?.total).toBe(15230);
    expect(state.error()).toBe('');
  });
});
