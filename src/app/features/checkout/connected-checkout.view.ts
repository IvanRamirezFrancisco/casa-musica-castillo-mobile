import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmarkCircle, shieldCheckmarkOutline } from 'ionicons/icons';
import { describeApiError } from '../../core/api/api-error-message';
import type { RealOrder } from '../../core/models/order.model';
import type { RealDeliveryOption, RealPaymentMethod } from '../../core/models/real-checkout.model';
import { CHECKOUT_REPOSITORY, REAL_CHECKOUT_WRITE_ENABLED } from '../../core/repositories/checkout.repository';
import { CartService } from '../../core/services/cart.service';
import { CheckoutQuoteStateService } from '../../core/services/checkout-quote-state.service';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcInputComponent } from '../../shared/ui/input/cmc-input.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';

const DELIVERY_OPTIONS: readonly { readonly value: RealDeliveryOption; readonly label: string }[] = [
  { value: 'PICKUP', label: 'Recoger en sucursal (Huejutla)' },
  { value: 'LOCAL', label: 'Envío local en la Huasteca' },
  { value: 'NATIONAL', label: 'Envío nacional (sujeto a cotización)' },
];

const PAYMENT_OPTIONS: readonly { readonly value: RealPaymentMethod; readonly label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Transferencia bancaria' },
  { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  { value: 'CASH_ON_DELIVERY', label: 'Pago contra entrega' },
  { value: 'DEBIT_CARD', label: 'Tarjeta de débito' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
];

/**
 * Checkout real conectado: separa la vista previa de precios (`POST /api/checkout/price-preview`)
 * de la confirmación final (`POST /api/checkout`), y bloquea la escritura mientras
 * `REAL_CHECKOUT_WRITE_ENABLED` sea `false` para proteger producción y entornos compartidos.
 */
@Component({
  selector: 'app-connected-checkout-view',
  host: { class: 'ion-page' },
  standalone: true,
  providers: [CheckoutQuoteStateService],
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonContent,
    IonIcon,
    CmcButtonComponent,
    CmcInputComponent,
    CmcLoadingComponent,
    CmcEmptyStateComponent,
    CmcErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    '.checkout-shell { display: grid; gap: 16px; padding-bottom: 32px; }',
    '.checkout-card { background: var(--cmc-surface, #fff); border: 1px solid rgba(114, 47, 55, 0.14); border-radius: 14px; padding: 16px; display: grid; gap: 12px; }',
    '.safety-banner { background: #fff6e0; color: #5c4300; border-left: 4px solid #c59b27; padding: 12px 14px; border-radius: 8px; font-size: 0.9rem; display: flex; gap: 10px; align-items: flex-start; }',
    '.error-banner { background: #fdecea; color: #7a1c14; padding: 12px 14px; border-radius: 8px; font-size: 0.9rem; }',
    '.radio-list { display: grid; gap: 8px; border: 0; padding: 0; margin: 0; }',
    '.radio-item { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 8px 10px; border: 1px solid rgba(0,0,0,0.12); border-radius: 10px; }',
    '.radio-item input { width: 20px; height: 20px; accent-color: var(--cmc-primary, #722f37); }',
    '.summary-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }',
    '.summary-total { border-top: 1px solid rgba(0,0,0,0.1); padding-top: 10px; font-weight: 700; font-size: 1.05rem; }',
  ],
  template: `
    <ion-header class="ion-no-border cmc-header-minimal">
      <ion-toolbar>
        <ion-buttons slot="start">
          <button type="button" aria-label="Volver al carrito" class="nav-back-btn" (click)="goBack()">
            <ion-icon name="arrow-back-outline" aria-hidden="true"></ion-icon>
          </button>
        </ion-buttons>
        <ion-title class="cmc-title" role="heading" aria-level="1">Finalizar compra</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="cmc-page" [scrollY]="true">
      <div class="cmc-page-container cmc-account checkout-shell">
        @if (createdOrder(); as order) {
          <section class="checkout-card" aria-live="polite">
            <ion-icon name="checkmark-circle" style="font-size: 2.5rem; color: #1b5e20" aria-hidden="true"></ion-icon>
            <h2 class="cmc-title">Pedido confirmado</h2>
            <p class="cmc-body">Folio <strong>{{ order.orderNumber }}</strong> · Estado: {{ order.statusLabel }}</p>
            <p class="cmc-body">Total registrado por el servidor: <strong>{{ order.total | currency:'MXN' }}</strong></p>
            <cmc-button fullWidth (click)="openOrder(order.id)">Ver detalle del pedido</cmc-button>
            <cmc-button variant="secondary" fullWidth (click)="goToOrders()">Ir a mis pedidos</cmc-button>
          </section>
        } @else if (cart.loading() && !cart.cart()) {
          <cmc-loading message="Verificando carrito real..."></cmc-loading>
        } @else if (cart.error() && !cart.cart()) {
          <cmc-error-state
            heading="No pudimos cargar tu carrito"
            [description]="cart.error()!"
            retryLabel="Reintentar"
            (retry)="reload()"
          ></cmc-error-state>
        } @else if (isEmpty()) {
          <cmc-empty-state
            heading="Tu carrito está vacío"
            description="Agrega instrumentos disponibles antes de calcular el envío o confirmar tu pedido."
          ></cmc-empty-state>
          <cmc-button fullWidth (click)="goBack()">Volver al carrito</cmc-button>
        } @else {
          @if (!writeEnabled) {
            <div class="safety-banner" role="note">
              <ion-icon name="shield-checkmark-outline" aria-hidden="true"></ion-icon>
              <span>
                Modo seguro activo: puedes consultar una cotización. La confirmación de compras no está disponible en esta versión; no se generarán pedidos ni cobros.
              </span>
            </div>
          }

          @if (errorMessage() || quoteState.error()) {
            <p class="error-banner" role="alert">{{ errorMessage() || quoteState.error() }}</p>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="checkout-shell" novalidate>
            <section class="checkout-card" aria-labelledby="delivery-heading">
              <h2 class="cmc-title" id="delivery-heading">1. Modalidad de entrega y cotización</h2>
              <fieldset class="radio-list">
                <legend class="sr-only">Selecciona modalidad de entrega</legend>
                @for (opt of deliveryOptions; track opt.value) {
                  <label class="radio-item">
                    <input
                      type="radio"
                      formControlName="deliveryOption"
                      [value]="opt.value"
                      (change)="onDeliveryOptionChange(opt.value)"
                    />
                    <span>{{ opt.label }}</span>
                  </label>
                }
              </fieldset>

              @if (form.controls.deliveryOption.value !== 'PICKUP') {
                <cmc-input formControlName="state" label="Estado" placeholder="Hidalgo"></cmc-input>
                <cmc-input formControlName="city" label="Ciudad o municipio" placeholder="Huejutla de Reyes"></cmc-input>
                <cmc-input formControlName="postalCode" label="Código postal" placeholder="43000"></cmc-input>
              }

              <cmc-button
                type="button"
                variant="secondary"
                fullWidth
                [loading]="previewLoading()"
                loadingLabel="Calculando"
                (click)="requestPreview()"
              >
                Calcular vista previa de precios
              </cmc-button>
            </section>

            @if (pricePreview(); as preview) {
              <section class="checkout-card" aria-labelledby="preview-heading" aria-live="polite">
                <h2 class="cmc-title" id="preview-heading">2. Importes calculados por el servidor</h2>
                <p class="cmc-body cmc-text-secondary">{{ preview.deliveryLabel }}</p>
                @if (preview.message) {
                  <p class="cmc-body">{{ preview.message }}</p>
                }
                @if (preview.quoteMessage) {
                  <p class="safety-banner" role="status">{{ preview.quoteMessage }}</p>
                }
                <div class="summary-row">
                  <span>Subtotal</span>
                  <strong>{{ preview.subtotal | currency:'MXN' }}</strong>
                </div>
                <div class="summary-row">
                  <span>Impuestos (IVA)</span>
                  <strong>{{ preview.tax | currency:'MXN' }}</strong>
                </div>
                <div class="summary-row">
                  <span>Envío</span>
                  <strong>{{ preview.requiresQuote ? 'Por cotizar' : (preview.shipping | currency:'MXN') }}</strong>
                </div>
                <div class="summary-row summary-total">
                  <span>Total</span>
                  <span class="cmc-primary">{{ preview.total | currency:'MXN' }}</span>
                </div>
              </section>
            }

            <section class="checkout-card" aria-labelledby="billing-heading">
              <h2 class="cmc-title" id="billing-heading">3. Datos de entrega, facturación y pago</h2>
              @if (requiresShippingAddress()) {
                <cmc-input
                  formControlName="shippingAddress"
                  label="Dirección de envío"
                  placeholder="Calle, número, colonia y referencias"
                  [error]="shippingAddressError()"
                ></cmc-input>
              }

              <cmc-input
                formControlName="billingAddress"
                label="Dirección de facturación / contacto"
                placeholder="Domicilio fiscal o de contacto"
                [error]="billingAddressError()"
              ></cmc-input>

              <cmc-input
                formControlName="authorizedPersons"
                label="Personas autorizadas para recibir (opcional)"
                placeholder="Nombre completo"
              ></cmc-input>

              <fieldset class="radio-list">
                <legend class="cmc-body cmc-font-bold">Método de pago</legend>
                @for (pm of paymentOptions; track pm.value) {
                  <label class="radio-item">
                    <input type="radio" formControlName="paymentMethod" [value]="pm.value" />
                    <span>{{ pm.label }}</span>
                  </label>
                }
              </fieldset>

              <cmc-input
                formControlName="notes"
                label="Notas del pedido (opcional)"
                placeholder="Indicaciones adicionales"
              ></cmc-input>

              <cmc-button
                type="submit"
                fullWidth
                [disabled]="!canSubmit()"
                [loading]="submitting()"
                loadingLabel="Confirmando pedido"
              >
                {{ writeEnabled ? 'Confirmar pedido real' : 'Confirmación real bloqueada por seguridad' }}
              </cmc-button>
            </section>
          </form>
        }
      </div>
    </ion-content>
  `,
})
export class ConnectedCheckoutComponent implements OnInit {
  protected readonly cart = inject(CartService);
  protected readonly writeEnabled = inject(REAL_CHECKOUT_WRITE_ENABLED);
  private readonly checkoutRepo = inject(CHECKOUT_REPOSITORY);
  protected readonly quoteState = inject(CheckoutQuoteStateService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);

  protected readonly deliveryOptions = DELIVERY_OPTIONS;
  protected readonly paymentOptions = PAYMENT_OPTIONS;
  protected readonly pricePreview = this.quoteState.quote;
  protected readonly previewLoading = this.quoteState.loading;
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly createdOrder = signal<RealOrder | null>(null);
  protected readonly isEmpty = computed(() => (this.cart.cart()?.items.length ?? 0) === 0);

  protected readonly form = this.fb.group({
    deliveryOption: ['PICKUP' as RealDeliveryOption, [Validators.required]],
    state: [''],
    city: [''],
    postalCode: [''],
    shippingAddress: [''],
    billingAddress: ['', [Validators.required, Validators.maxLength(500)]],
    authorizedPersons: ['', [Validators.maxLength(300)]],
    paymentMethod: ['BANK_TRANSFER' as RealPaymentMethod, [Validators.required]],
    notes: ['', [Validators.maxLength(1000)]],
  });

  protected requiresShippingAddress(): boolean {
    return (this.pricePreview()?.requiresAddress ?? false) || this.form.controls.deliveryOption.value !== 'PICKUP';
  }

  constructor() {
    addIcons({ arrowBackOutline, checkmarkCircle, shieldCheckmarkOutline });
    for (const control of [this.form.controls.deliveryOption, this.form.controls.state, this.form.controls.city, this.form.controls.postalCode]) {
      control.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.quoteState.invalidate());
    }
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.errorMessage.set('');
    this.cart.load();
    this.requestPreview();
  }

  onDeliveryOptionChange(option: RealDeliveryOption): void {
    this.form.controls.deliveryOption.setValue(option);
    this.requestPreview();
  }

  requestPreview(): void {
    this.errorMessage.set('');
    const raw = this.form.getRawValue();
    this.quoteState.load({
        deliveryOption: raw.deliveryOption,
        state: raw.state,
        city: raw.city,
        postalCode: raw.postalCode,
      });
  }

  canSubmit(): boolean {
    const preview = this.pricePreview();
    if (!this.writeEnabled || this.submitting() || !preview || !preview.canProceedToPayment || preview.requiresQuote) {
      return false;
    }
    return this.cart.cart()?.canCheckout ?? false;
  }

  submit(): void {
    if (!this.writeEnabled) {
      this.errorMessage.set(
        'La confirmación real de pedidos está bloqueada por seguridad. Solo se permite en un entorno aislado autorizado.',
      );
      return;
    }
    const preview = this.pricePreview();
    if (!preview || !preview.canProceedToPayment || preview.requiresQuote) {
      this.errorMessage.set('Calcula primero una vista previa válida que permita continuar al pago.');
      return;
    }
    const raw = this.form.getRawValue();
    if (!raw.billingAddress.trim() || (this.requiresShippingAddress() && !raw.shippingAddress.trim())) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Completa los domicilios requeridos antes de confirmar el pedido.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revisa los datos y la longitud de los campos antes de continuar.');
      return;
    }
    if (this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    this.cart.validate().subscribe({
      next: (validation) => {
        if (!validation.valid || !validation.canCheckout) {
          this.submitting.set(false);
          this.errorMessage.set(
            validation.globalErrors[0] ?? 'Tu carrito tiene artículos sin disponibilidad. Revísalo antes de continuar.',
          );
          return;
        }
        this.checkoutRepo
          .submitCheckout({
            deliveryOption: raw.deliveryOption,
            shippingAddress: raw.shippingAddress,
            state: raw.state,
            city: raw.city,
            postalCode: raw.postalCode,
            authorizedPersons: raw.authorizedPersons,
            billingAddress: raw.billingAddress,
            paymentMethod: raw.paymentMethod,
            notes: raw.notes,
          })
          .subscribe({
            next: (order) => {
              this.submitting.set(false);
              this.createdOrder.set(order);
              this.cart.refreshSummary().subscribe({ error: () => undefined });
            },
            error: (err: unknown) => {
              this.submitting.set(false);
              this.errorMessage.set(describeApiError(err, 'form'));
            },
          });
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(describeApiError(err));
      },
    });
  }

  protected shippingAddressError(): string {
    const ctrl = this.form.controls.shippingAddress;
    return this.requiresShippingAddress() && ctrl.touched && !ctrl.value.trim() ? 'Ingresa la dirección de envío.' : '';
  }

  protected billingAddressError(): string {
    const ctrl = this.form.controls.billingAddress;
    return ctrl.touched && !ctrl.value.trim() ? 'Ingresa la dirección de facturación o contacto.' : '';
  }

  openOrder(id: number): void {
    void this.router.navigate(['/orders', id]);
  }

  goToOrders(): void {
    void this.nav.navigateRoot(['/main/orders'], { replaceUrl: true });
  }

  goBack(): void {
    void this.nav.navigateBack(['/main/cart']);
  }
}
