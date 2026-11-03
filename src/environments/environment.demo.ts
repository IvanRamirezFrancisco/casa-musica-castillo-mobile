import { AppEnvironment } from './environment-settings';

// Explicit offline acceptance configuration; never selected after an HTTP failure.
export const environment = {
  name: 'demo',
  production: true,
  publicCatalogEnabled: false,
  // Reserved non-resolving domain prevents accidental commercial HTTP calls.
  apiBaseUrl: 'https://demo.invalid',
} satisfies AppEnvironment;
