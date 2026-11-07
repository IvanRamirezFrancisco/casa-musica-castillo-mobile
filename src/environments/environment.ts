// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Capacitor } from '@capacitor/core';
import { developmentEnvironment } from './environment-settings';

// Only explicit device builds define this public origin. Browser/emulator defaults stay local.
declare const CMC_DEVICE_API_URL: string | undefined;
export const environment = developmentEnvironment(
  Capacitor.getPlatform(),
  typeof CMC_DEVICE_API_URL === 'undefined' ? undefined : CMC_DEVICE_API_URL,
);

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
