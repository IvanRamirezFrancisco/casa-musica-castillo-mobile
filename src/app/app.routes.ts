import { Routes } from '@angular/router';

export const routes: Routes = [
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
    path: 'main',
    loadComponent: () => import('./layout/main-navigation/main-navigation.component').then((m) => m.MainNavigationComponent),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'catalog',
        loadComponent: () => import('./features/dummy/dummy.page').then((m) => m.DummyPage),
      },
      {
        path: 'cart',
        loadComponent: () => import('./features/dummy/dummy.page').then((m) => m.DummyPage),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/dummy/dummy.page').then((m) => m.DummyPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/dummy/dummy.page').then((m) => m.DummyPage),
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
];
