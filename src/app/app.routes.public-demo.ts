import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'splash', pathMatch: 'full' },
  { path: 'splash', loadComponent: () => import('./features/splash/splash.page').then(m => m.SplashPage) },
  {
    path: 'main',
    loadComponent: () => import('./layout/main-navigation/public-navigation.component').then(m => m.PublicNavigationComponent),
    children: [
      { path: 'home', loadComponent: () => import('./features/public-catalog/public-home.view').then(m => m.PublicHomeComponent) },
      { path: 'catalog', loadComponent: () => import('./features/public-catalog/public-catalog.view').then(m => m.PublicCatalogComponent) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: 'products/:id', loadComponent: () => import('./features/public-catalog/public-product-detail.view').then(m => m.PublicProductDetailComponent) },
  { path: '**', redirectTo: 'main/home' },
];
