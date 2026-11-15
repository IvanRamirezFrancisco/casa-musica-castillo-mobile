import type { Routes } from '@angular/router';
import { authGuard } from './core/security/auth.guard';

export const page = {
  login: () => import('./features/auth/connected/connected-login.page').then(m => m.ConnectedLoginPage),
  register: () => import('./features/auth/connected/connected-register.page').then(m => m.ConnectedRegisterPage),
  recover: () => import('./features/auth/connected/connected-forgot-password.page').then(m => m.ConnectedForgotPasswordPage),
  home: () => import('./features/public-catalog/public-home.view').then(m => m.PublicHomeComponent),
  catalog: () => import('./features/public-catalog/public-catalog.view').then(m => m.PublicCatalogComponent),
  cart: () => import('./features/cart/connected-cart.view').then(m => m.ConnectedCartComponent),
  orders: () => import('./features/orders/connected-orders.view').then(m => m.ConnectedOrdersComponent),
  profile: () => import('./features/profile/connected-profile.view').then(m => m.ConnectedProfileComponent),
  orderDetail: () => import('./features/orders/order-detail/connected-order-detail.view').then(m => m.ConnectedOrderDetailComponent),
  favorites: () => import('./features/favorites/connected-favorites.view').then(m => m.ConnectedFavoritesComponent),
  product: () => import('./features/public-catalog/public-product-detail.view').then(m => m.PublicProductDetailComponent),
};

export const extraRoutes: Routes = [
  { path: 'checkout', canActivate: [authGuard], children: [
    { path: '', loadComponent: () => import('./features/checkout/connected-checkout.view').then(m => m.ConnectedCheckoutComponent) },
    { path: '**', redirectTo: '' },
  ] },
  { path: 'profile/edit', redirectTo: 'main/profile' },
];
