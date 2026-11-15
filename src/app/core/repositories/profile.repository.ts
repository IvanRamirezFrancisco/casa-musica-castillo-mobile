import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpProfileRepository } from '../infrastructure/http-profile.repository';
import type { UserProfile } from '../models/profile.model';

export interface ProfileRepository {
  getProfile(): Observable<UserProfile>;
}

export const PROFILE_REPOSITORY = new InjectionToken<ProfileRepository>('PROFILE_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(HttpProfileRepository),
});
