import { AppEnvironment, PRODUCTION_API_BASE_URL } from './environment-settings';

export const environment = {
  name: 'production',
  publicCatalogEnabled: true,
  production: true,
  apiBaseUrl: PRODUCTION_API_BASE_URL,
} satisfies AppEnvironment;
