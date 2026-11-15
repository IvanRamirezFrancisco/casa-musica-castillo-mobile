import { computed, inject } from '@angular/core';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { CartService } from '../../core/services/cart.service';
import { DemoCheckoutStateService } from '../../core/services/demo-checkout-state.service';

export function cartCount() {
  return inject(BACKEND_SESSION_ENABLED) ? inject(CartService).itemCount
    : computed(inject(DemoCheckoutStateService).itemCount);
}
