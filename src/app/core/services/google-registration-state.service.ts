import { Injectable, signal } from '@angular/core';
import type { PendingGoogleRegistration, TwoFactorChallenge } from '../models/auth.model';

export interface PendingGoogleState {
  readonly pending: PendingGoogleRegistration;
  readonly returnUrl: string;
  readonly source: 'login' | 'register';
}

export interface PendingGoogleTwoFactorState {
  readonly challenge: TwoFactorChallenge;
  readonly returnUrl: string;
}

const DEFAULT_LINK_INTENT_TTL_MS = 10 * 60 * 1000;

/** Estado en memoria para completar registro federado con Google o transferir MFA sin exponer tokens en URL o storage. */
@Injectable({ providedIn: 'root' })
export class GoogleRegistrationStateService {
  private readonly currentState = signal<PendingGoogleState | null>(null);
  private readonly twoFactorState = signal<PendingGoogleTwoFactorState | null>(null);
  private readonly linkIntentExpiresAt = signal<number | null>(null);

  readonly state = this.currentState.asReadonly();

  set(pending: PendingGoogleRegistration, returnUrl = '/main/home', source: 'login' | 'register' = 'login'): void {
    this.twoFactorState.set(null);
    this.currentState.set({ pending, returnUrl, source });
  }

  setTwoFactorHandoff(challenge: TwoFactorChallenge, returnUrl = '/main/home'): void {
    this.currentState.set(null);
    this.twoFactorState.set({ challenge, returnUrl });
  }

  consumeTwoFactorHandoff(): PendingGoogleTwoFactorState | null {
    const handoff = this.twoFactorState();
    this.twoFactorState.set(null);
    return handoff;
  }

  setLinkIntent(ttlMs = DEFAULT_LINK_INTENT_TTL_MS): void {
    const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_LINK_INTENT_TTL_MS;
    this.linkIntentExpiresAt.set(Date.now() + safeTtl);
  }

  hasActiveLinkIntent(now = Date.now()): boolean {
    const expiresAt = this.linkIntentExpiresAt();
    if (expiresAt === null) return false;
    if (expiresAt <= now) {
      this.linkIntentExpiresAt.set(null);
      return false;
    }
    return true;
  }

  consumeLinkIntent(now = Date.now()): boolean {
    const active = this.hasActiveLinkIntent(now);
    this.linkIntentExpiresAt.set(null);
    return active;
  }

  clearLinkIntent(): void {
    this.linkIntentExpiresAt.set(null);
  }

  clear(): void {
    this.currentState.set(null);
    this.twoFactorState.set(null);
  }
}
