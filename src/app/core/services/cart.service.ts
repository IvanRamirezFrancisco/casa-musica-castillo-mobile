import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
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
    return this.repository.summary().pipe(tap((summary) => this.summaryCount.set(summary.totalItems)));
  }

  /** Agrega un producto por `productId` (`POST /api/cart/items`). */
  addProduct(productId: number, quantity = 1): Observable<Cart> {
    this.mutatingState.set(true);
    this.actionMessage.set(null);
    const session = this.auth.sessionVersion;
    return this.repository.addItem(productId, quantity).pipe(
      tap({
        next: (cart) => { if (this.auth.sessionVersion === session) this.applyCart(cart); },
        error: (error: unknown) => {
          if (this.auth.sessionVersion === session) this.actionMessage.set(describeApiError(error, 'form'));
        },
      }),
      finalize(() => { if (this.auth.sessionVersion === session) this.mutatingState.set(false); }),
    );
  }

  /** Actualiza la cantidad de una partida por `itemId` (`PUT /api/cart/items/{itemId}`). */
  setItemQuantity(itemId: number, quantity: number): void {
    if (this.mutatingState() || !Number.isSafeInteger(quantity)) return;
    if (quantity < CART_LIMITS.minQuantity || quantity > CART_LIMITS.maxQuantity) {
      this.actionMessage.set(`La cantidad permitida es de ${CART_LIMITS.minQuantity} a ${CART_LIMITS.maxQuantity} unidades.`);
      return;
    }
    this.mutatingState.set(true);
    this.actionMessage.set(null);
    this.repository.updateItemQuantity(itemId, quantity).subscribe({
      next: (cart) => { this.mutatingState.set(false); this.applyCart(cart); },
      error: (error: unknown) => {
        this.mutatingState.set(false);
        this.actionMessage.set(describeApiError(error, 'form'));
      },
    });
  }

  /** Elimina una partida por `itemId` (`DELETE /api/cart/items/{itemId}`). */
  removeItem(itemId: number): void {
    if (this.mutatingState()) return;
    this.mutatingState.set(true);
    this.actionMessage.set(null);
    this.repository.removeItem(itemId).subscribe({
      next: (cart) => { this.mutatingState.set(false); this.applyCart(cart); },
      error: (error: unknown) => {
        this.mutatingState.set(false);
        this.actionMessage.set(describeApiError(error));
      },
    });
  }

  /** Vacía el carrito (`DELETE /api/cart`) sin invocar `GET /api/cart` después. */
  clear(): void {
    if (this.mutatingState()) return;
    this.mutatingState.set(true);
    this.actionMessage.set(null);
    this.repository.clear().subscribe({
      next: () => {
        this.mutatingState.set(false);
        const existing = this.current();
        if (existing) {
          this.applyCart({
            ...existing, items: [], totalItems: 0, subtotal: 0, tax: 0, discount: 0, total: 0,
            couponCode: null, canCheckout: false, warningMessage: null,
          });
        } else {
          this.summaryCount.set(0);
        }
      },
      error: (error: unknown) => {
        this.mutatingState.set(false);
        this.actionMessage.set(describeApiError(error));
      },
    });
  }

  /** Valida existencias antes de continuar (`GET /api/cart/validate`). */
  validate(): Observable<CartValidation> {
    this.mutatingState.set(true);
    this.actionMessage.set(null);
    return this.repository.validate().pipe(
      tap({
        next: (result) => { this.mutatingState.set(false); this.validationState.set(result); },
        error: (error: unknown) => {
          this.mutatingState.set(false);
          this.actionMessage.set(describeApiError(error));
        },
      }),
    );
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
    this.current.set(cart);
    this.summaryCount.set(cart.totalItems);
    this.validationState.set(null);
  }
}
