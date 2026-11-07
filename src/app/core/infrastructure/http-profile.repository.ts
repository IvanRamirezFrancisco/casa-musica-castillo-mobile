import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { parseUserProfile } from '../api/profile.validation';
import type { UserProfile } from '../models/profile.model';
import { ProfileRepository } from '../repositories/profile.repository';

@Injectable({ providedIn: 'root' })
export class HttpProfileRepository implements ProfileRepository {
  private readonly api = inject(ApiClientService);

  getProfile(): Observable<UserProfile> {
    return this.api.get<unknown>('/api/users/profile', undefined, { auth: true }).pipe(
      map((raw) => parseUserProfile(raw)),
    );
  }
}
