import { Routes } from '@angular/router';
import { authGuard } from './core/security/auth.guard';

export const routes: Routes = [
  {
    path: 'api-connection',
    loadComponent: () => import('./features/api-connection/api-connection.page').then((m) => m.ApiConnectionPage),
  },
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full',
  },
  {
    path: 'splash',
    loadComponent: () => import('./features/splash/splash.page').then((m) => m.SplashPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/connected/verify-email.page').then((m) => m.VerifyEmailPage),
  },
  {
    path: 'main',
    loadComponent: () => import('./layout/main-navigation/main-navigation.component').then((m) => m.MainNavigationComponent),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'catalog',
        loadComponent: () => import('./features/catalog/catalog.page').then((m) => m.CatalogPage),
      },
      {
        path: 'cart',
        canActivate: [authGuard],
        loadComponent: () => import('./features/cart/cart.page').then((m) => m.CartPage),
      },
      {
        path: 'orders',
        canActivate: [authGuard],
        loadComponent: () => import('./features/orders/orders.page').then((m) => m.OrdersPage),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
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
    path: 'orders/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/order-detail/order-detail.page').then((m) => m.OrderDetailPage),
  },
  { path: 'profile/security', canActivate: [authGuard], loadComponent: () => import('./features/profile/account-security.page').then(m => m.AccountSecurityPage) },
  {
    path: 'profile/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/edit-profile/edit-profile.page').then((m) => m.EditProfilePage),
  },
  {
    path: 'favorites',
    canActivate: [authGuard],
    loadComponent: () => import('./features/favorites/favorites.page').then(m => m.FavoritesPage),
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/catalog/product-detail/product-detail.page').then(m => m.ProductDetailPage),
  },
  {
    path: 'not-found',
    loadComponent: () => import('./features/not-found/not-found.page').then(m => m.NotFoundPage),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.page').then(m => m.NotFoundPage),
  },
];
