import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, defer, finalize, tap } from 'rxjs';
import { describeApiError } from '../api/api-error-message';
import { CART_LIMITS, type Cart, type CartSummary, type CartValidation } from '../models/cart.model';
import { CART_REPOSITORY } from '../repositories/cart.repository';
import { AuthService } from './auth.service';

/**
 * Estado compartido del carrito real (Singleton). Las mutaciones actualizan el estado directamente
 * con el `CartResponse` devuelto por el servidor (autoridad única de precios, impuestos y totales),
 * evitando llamadas adicionales a `GET /api/cart`. Al terminar la sesión se limpia todo el estado.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly repository = inject(CART_REPOSITORY);
  private readonly auth = inject(AuthService);

  private readonly current = signal<Cart | null>(null);
  private readonly summaryCount = signal<number | null>(null);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly loadError = signal<string | null>(null);
  private readonly actionMessage = signal<string | null>(null);
  private readonly validationState = signal<CartValidation | null>(null);
  private loadSeq = 0;

  readonly cart = this.current.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly mutating = this.mutatingState.asReadonly();
  readonly error = this.loadError.asReadonly();
  readonly notice = this.actionMessage.asReadonly();
  readonly validation = this.validationState.asReadonly();
  /** Indicador de navegación: usa el carrito cargado o el último `/summary`. */
  readonly itemCount = computed(() => this.current()?.totalItems ?? this.summaryCount() ?? 0);

  constructor() {
    this.auth.sessionEnded$.subscribe(() => this.reset());
  }

  /** Consulta explícita de la pantalla del carrito (`GET /api/cart`). */
  load(): void {
    const seq = ++this.loadSeq;
    this.loadingState.set(true);
    this.loadError.set(null);
    this.actionMessage.set(null);
    this.repository.loadCart().subscribe({
      next: (cart) => {
        if (seq !== this.loadSeq) return;
        this.loadingState.set(false);
        this.applyCart(cart);
      },
      error: (error: unknown) => {
        if (seq !== this.loadSeq) return;
        this.loadingState.set(false);
        this.loadError.set(describeApiError(error));
      },
    });
  }

  /** Consulta ligera del resumen (`GET /api/cart/summary`), sin crear carrito. */
  refreshSummary(): Observable<CartSummary> {
    return defer(() => {
      const seq = this.loadSeq;
      return this.repository.summary().pipe(tap((summary) => {
        if (seq === this.loadSeq) this.summaryCount.set(summary.totalItems);
      }));
    });
  }

  /** Agrega un producto por `productId` (`POST /api/cart/items`). */
  addProduct(productId: number, quantity = 1): Observable<Cart> {
    return this.mutation(this.repository.addItem(productId, quantity), cart => this.applyCart(cart), 'form');
  }

  /** Actualiza la cantidad de una partida por `itemId` (`PUT /api/cart/items/{itemId}`). */
  setItemQuantity(itemId: number, quantity: number): void {
    if (this.mutatingState() || !Number.isSafeInteger(quantity)) return;
    if (quantity < CART_LIMITS.minQuantity || quantity > CART_LIMITS.maxQuantity) {
      this.actionMessage.set(`La cantidad permitida es de ${CART_LIMITS.minQuantity} a ${CART_LIMITS.maxQuantity} unidades.`);
      return;
    }
    this.mutation(this.repository.updateItemQuantity(itemId, quantity), cart => this.applyCart(cart), 'form')
      .subscribe({ error: () => undefined });
  }

  /** Elimina una partida por `itemId` (`DELETE /api/cart/items/{itemId}`). */
  removeItem(itemId: number): void {
    if (this.mutatingState()) return;
    this.mutation(this.repository.removeItem(itemId), cart => this.applyCart(cart))
      .subscribe({ error: () => undefined });
  }

  /** Vacía el carrito (`DELETE /api/cart`) sin invocar `GET /api/cart` después. */
  clear(): void {
    if (this.mutatingState()) return;
    this.mutation(this.repository.clear(), () => {
      const existing = this.current();
      if (!existing) { this.reset(); this.summaryCount.set(0); return; }
      this.applyCart({
        ...existing, items: [], totalItems: 0, subtotal: 0, tax: 0, discount: 0, total: 0,
        couponCode: null, canCheckout: false, warningMessage: null,
      });
    }).subscribe({ error: () => undefined });
  }

  /** Valida existencias antes de continuar (`GET /api/cart/validate`). */
  validate(): Observable<CartValidation> {
    return this.mutation(this.repository.validate(), result => this.validationState.set(result));
  }

  reset(): void {
    this.loadSeq++;
    this.current.set(null);
    this.summaryCount.set(null);
    this.loadingState.set(false);
    this.mutatingState.set(false);
    this.loadError.set(null);
    this.actionMessage.set(null);
    this.validationState.set(null);
  }

  private applyCart(cart: Cart): void {
    this.loadSeq++;
    this.loadingState.set(false);
    this.loadError.set(null);
    this.current.set(cart);
    this.summaryCount.set(cart.totalItems);
    this.validationState.set(null);
  }

  private mutation<T>(request: Observable<T>, accept: (value: T) => void, context?: 'form'): Observable<T> {
    return defer(() => {
      const session = this.auth.sessionVersion;
      this.mutatingState.set(true);
      this.actionMessage.set(null);
      return request.pipe(tap({
        next: (value) => { if (session === this.auth.sessionVersion) accept(value); },
        error: (error: unknown) => {
          if (session === this.auth.sessionVersion) this.actionMessage.set(describeApiError(error, context));
        },
      }), finalize(() => { if (session === this.auth.sessionVersion) this.mutatingState.set(false); }));
    });
  }
}
