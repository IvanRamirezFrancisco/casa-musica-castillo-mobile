import type { Routes } from '@angular/router';
import { authGuard } from './core/security/auth.guard';

export const page = {
  login: () => import('./features/auth/login/login.page').then(m => m.LoginPage),
  register: () => import('./features/auth/register/register.page').then(m => m.RegisterPage),
  recover: () => import('./features/auth/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage),
  home: () => import('./features/home/home.page').then(m => m.HomePage),
  catalog: () => import('./features/catalog/catalog.page').then(m => m.CatalogPage),
  cart: () => import('./features/cart/cart.page').then(m => m.CartPage),
  orders: () => import('./features/orders/orders.page').then(m => m.OrdersPage),
  profile: () => import('./features/profile/profile.page').then(m => m.ProfilePage),
  orderDetail: () => import('./features/orders/order-detail/order-detail.page').then(m => m.OrderDetailPage),
  favorites: () => import('./features/favorites/favorites.page').then(m => m.FavoritesPage),
  product: () => import('./features/catalog/product-detail/product-detail.page').then(m => m.ProductDetailPage),
};

export const extraRoutes: Routes = [
  {
    path: 'api-connection',
    loadComponent: () => import('./features/api-connection/api-connection.page').then((m) => m.ApiConnectionPage),
  },
  {
    path: 'foundation-preview',
    loadComponent: () =>
      import('./features/foundation-preview/foundation-preview.page').then(
        (m) => m.FoundationPreviewPage,
      ),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadChildren: () => import('./features/checkout/checkout.routes').then((m) => m.routes),
  },
  {
    path: 'profile/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/edit-profile/edit-profile.page').then((m) => m.EditProfilePage),
  },
];
