import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'foundation-preview',
    loadComponent: () =>
      import('./features/foundation-preview/foundation-preview.page').then(
        (m) => m.FoundationPreviewPage,
      ),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
