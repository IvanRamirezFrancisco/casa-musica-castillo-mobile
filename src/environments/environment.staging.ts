import { stagingEnvironment } from './environment-settings';

declare const CMC_STAGING_API_URL: string | undefined;
// No infrastructure presumed. Supported builds require an origin and isolation confirmation.
// An unconfigured direct bundle fails closed before any HTTP calls.
export const environment = stagingEnvironment(typeof CMC_STAGING_API_URL === 'undefined' ? '' : CMC_STAGING_API_URL);
