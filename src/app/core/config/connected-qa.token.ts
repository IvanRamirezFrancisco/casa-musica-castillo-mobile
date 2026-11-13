import { InjectionToken } from '@angular/core';

declare const CMC_CONNECTED_QA: boolean;

export const CONNECTED_QA = new InjectionToken<boolean>('CONNECTED_QA', {
  providedIn: 'root',
  factory: () => typeof CMC_CONNECTED_QA !== 'undefined' && CMC_CONNECTED_QA,
});
