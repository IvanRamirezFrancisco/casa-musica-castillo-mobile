import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export const PUBLIC_DEMO = new InjectionToken<boolean>('PUBLIC_DEMO', {
  providedIn: 'root',
  factory: () => 'publicDemo' in environment && environment.publicDemo === true,
});
