import { InjectionToken, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Cart, CartSummary, CartValidation } from '../models/cart.model';
import { HttpCartRepository } from '../infrastructure/http-cart.repository';

/**
 * Puerto del carrito real (`ShoppingCartController`).
 * Distingue `productId` (agregar desde catálogo) de `itemId` (modificar o eliminar una partida).
 * `loadCart()` ejecuta `GET /api/cart`, que en el servidor crea o renueva el carrito: solo debe
 * invocarse cuando el usuario entra al carrito o pide reintentar, no como sondeo en segundo plano.
 */
export interface CartRepository {
  loadCart(): Observable<Cart>;
  summary(): Observable<CartSummary>;
  addItem(productId: number, quantity: number): Observable<Cart>;
  updateItemQuantity(itemId: number, quantity: number): Observable<Cart>;
  removeItem(itemId: number): Observable<Cart>;
  clear(): Observable<void>;
  validate(): Observable<CartValidation>;
}

export const CART_REPOSITORY = new InjectionToken<CartRepository>('CART_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(HttpCartRepository),
});
