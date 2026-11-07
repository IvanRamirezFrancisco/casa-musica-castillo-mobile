import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { BACKEND_SESSION_ENABLED } from '../config/backend-session.token';
import type { UserProfile } from '../models/profile.model';
import { PROFILE_REPOSITORY } from '../repositories/profile.repository';
import { AuthService } from './auth.service';

/** Screen-scoped access through the existing authenticated self-profile contract. */
@Injectable()
export class PrivacyDataService {
  readonly connected = inject(BACKEND_SESSION_ENABLED);
  private readonly auth = inject(AuthService);
  private readonly repository = inject(PROFILE_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  private request: Subscription | null = null;
  private generation = 0;
  constructor() {
    this.auth.sessionEnded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.clear());
    this.destroyRef.onDestroy(() => this.clear());
  }
  load(): void {
    this.clear();
    if (!this.connected) { this.error.set('DEMO no consulta datos personales del servidor.'); return; }
    const userId = this.auth.user()?.id;
    if (userId === undefined || !this.auth.hasValidSession()) {
      this.error.set('Inicia sesión para consultar los datos de tu cuenta.'); return;
    }
    const generation = this.generation;
    this.loading.set(true);
    this.request = this.repository.getProfile().subscribe({
      next: profile => {
        if (generation !== this.generation) return;
        this.loading.set(false);
        if (!this.auth.hasValidSession() || this.auth.user()?.id !== userId || profile.id !== userId) {
          this.error.set('No pudimos verificar los datos de tu cuenta. Vuelve a iniciar sesión.'); return;
        }
        this.profile.set(profile);
      },
      error: () => {
        if (generation !== this.generation) return;
        this.loading.set(false); this.error.set('No pudimos consultar tus datos. Puedes reintentar.');
      },
    });
  }
  clear(): void {
    this.generation++; this.request?.unsubscribe(); this.request = null;
    this.profile.set(null); this.loading.set(false); this.error.set('');
  }
}
