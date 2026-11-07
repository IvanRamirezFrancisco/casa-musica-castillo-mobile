import { InjectionToken, inject } from '@angular/core';
import type { SessionStore } from '../models/auth.model';
import { API_BASE_URL } from '../api/api-base-url.token';
import { BACKEND_SESSION_ENABLED } from '../config/backend-session.token';
import { createSessionStore } from '../infrastructure/native-session.store';

export const SESSION_STORE = new InjectionToken<SessionStore>('SESSION_STORE', {
  providedIn: 'root',
  factory: () => createSessionStore(inject(BACKEND_SESSION_ENABLED), inject(API_BASE_URL)),
});
