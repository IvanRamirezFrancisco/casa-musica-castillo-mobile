import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./checkout-summary/checkout-summary.page').then(m => m.CheckoutSummaryPage)
  },
  {
    path: 'delivery',
    loadComponent: () => import('./delivery-method/delivery-method.page').then(m => m.DeliveryMethodPage)
  },
  {
    path: 'payment',
    loadComponent: () => import('./payment-method/payment-method.page').then(m => m.PaymentMethodPage)
  },
  {
    path: 'confirmation',
    loadComponent: () => import('./confirmation/confirmation.page').then(m => m.ConfirmationPage)
  }
];
