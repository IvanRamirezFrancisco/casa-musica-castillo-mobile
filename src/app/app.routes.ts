import { Routes } from '@angular/router';
import { authGuard } from './core/security/auth.guard';

import { extraRoutes, page } from './app-page-loaders';

export const routes: Routes = [
  { path: 'privacy', loadComponent: () => import('./features/privacy/privacy.page').then(m => m.PrivacyPage) },
  ...extraRoutes,
  { path: 'privacy/my-data', canActivate: [authGuard], loadComponent: () => import('./features/privacy/my-data.page').then(m => m.MyPrivacyDataPage) },
  { path: 'privacy/delete-account', canActivate: [authGuard], loadComponent: () => import('./features/privacy/deletion-request.page').then(m => m.DeletionRequestPage) },
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
    loadComponent: page.login,
  },
  {
    path: 'register',
    loadComponent: page.register,
  },
  {
    path: 'forgot-password',
    loadComponent: page.recover,
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
        loadComponent: page.home,
      },
      {
        path: 'catalog',
        loadComponent: page.catalog,
      },
      {
        path: 'cart',
        canActivate: [authGuard],
        loadComponent: page.cart,
      },
      {
        path: 'orders',
        canActivate: [authGuard],
        loadComponent: page.orders,
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: page.profile,
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'orders/:id',
    canActivate: [authGuard],
    loadComponent: page.orderDetail,
  },
  { path: 'profile/security', canActivate: [authGuard], loadComponent: () => import('./features/profile/account-security.page').then(m => m.AccountSecurityPage) },
  {
    path: 'favorites',
    canActivate: [authGuard],
    loadComponent: page.favorites,
  },
  {
    path: 'products/:id',
    loadComponent: page.product,
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
