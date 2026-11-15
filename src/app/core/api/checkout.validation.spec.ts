import { ApiError } from './api-error';
import { pricePreviewDto } from './auth.testing';
import { parsePricePreview } from './checkout.validation';

describe('checkout.validation', () => {
  it('valida PricePreviewResponse con importes del servidor y banderas de entrega', () => {
    const preview = parsePricePreview(pricePreviewDto());
    expect([preview.subtotal, preview.tax, preview.shipping, preview.total]).toEqual([13000, 2080, 150, 15230]);
    expect([preview.deliveryMethod, preview.deliveryLabel, preview.requiresAddress, preview.canProceedToPayment]).toEqual([
      'LOCAL',
      'Envío local en la Huasteca',
      true,
      true,
    ]);
  });

  it('usa deliveryMethod como etiqueta de respaldo y normaliza opcionales vacíos', () => {
    const preview = parsePricePreview(
      pricePreviewDto({
        deliveryLabel: '   ',
        message: ' ',
        contactWhatsapp: null,
        contactPhone: undefined,
        quoteMessage: 'Requiere cotización',
        businessHours: '',
      }),
    );
    expect(preview.deliveryLabel).toBe('LOCAL');
    expect(preview.message).toBeNull();
    expect(preview.quoteMessage).toBe('Requiere cotización');
    expect(preview.businessHours).toBeNull();
  });

  it.each([
    ['no objeto', null],
    ['subtotal negativo', pricePreviewDto({ subtotal: -1 })],
    ['tax inválido', pricePreviewDto({ tax: 'x' })],
    ['shipping infinito', pricePreviewDto({ shipping: Number.POSITIVE_INFINITY })],
    ['total negativo', pricePreviewDto({ total: -5 })],
    ['deliveryMethod vacío', pricePreviewDto({ deliveryMethod: ' ' })],
    ['requiresAddress no booleano', pricePreviewDto({ requiresAddress: 'si' })],
    ['requiresQuote no booleano', pricePreviewDto({ requiresQuote: 0 })],
    ['canProceedToPayment no booleano', pricePreviewDto({ canProceedToPayment: null })],
    ['message no cadena', pricePreviewDto({ message: 123 })],
  ])('rechaza vista previa incompatible: %s', (_name, body) => {
    expect(() => parsePricePreview(body)).toThrow(ApiError);
  });
});
