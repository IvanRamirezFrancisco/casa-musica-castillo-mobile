import { AppEnvironment, EMULATOR_INTEGRATION_API_BASE_URL, stagingEnvironment } from './environment-settings';

declare const CMC_STAGING_API_URL: string | undefined;
declare const CMC_EMULATOR_INTEGRATION: boolean | undefined;
// No infrastructure presumed. Supported builds require an origin and isolation confirmation.
// An unconfigured direct bundle fails closed before any HTTP calls.
export const environment: AppEnvironment = typeof CMC_EMULATOR_INTEGRATION !== 'undefined' && CMC_EMULATOR_INTEGRATION
  ? { name: 'staging', production: true, publicCatalogEnabled: true, apiBaseUrl: EMULATOR_INTEGRATION_API_BASE_URL }
  : stagingEnvironment(typeof CMC_STAGING_API_URL === 'undefined' ? '' : CMC_STAGING_API_URL);
