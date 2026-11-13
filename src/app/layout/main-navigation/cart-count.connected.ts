import { inject } from '@angular/core';
import { CartService } from '../../core/services/cart.service';

export function cartCount() {
  return inject(CartService).itemCount;
}
