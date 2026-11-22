import { Injectable, InjectionToken, inject } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { AUTH_REPOSITORY } from '../repositories/auth.repository';
import type { GoogleAuthConfig, GoogleChallenge } from '../models/auth.model';

export interface GoogleCredentialPlugin {
  signIn(options: { serverClientId: string; nonce: string }): Promise<{ cancelled?: boolean; idToken?: string }>;
  clearCredentialState(): Promise<void>;
}

const NativeGoogleCredential = registerPlugin<GoogleCredentialPlugin>('GoogleCredential');

// Wrap the Capacitor Proxy in a plain object so Angular Injector teardown never calls Proxy.ngOnDestroy().
export const GOOGLE_CREDENTIAL_PLUGIN = new InjectionToken<GoogleCredentialPlugin>('GOOGLE_CREDENTIAL_PLUGIN', {
  providedIn: 'root',
  factory: () => ({
    signIn: (options) => NativeGoogleCredential.signIn(options),
    clearCredentialState: () => NativeGoogleCredential.clearCredentialState(),
  }),
});

export interface GoogleCredentialWindow {
  google?: {
    accounts?: {
      id?: {
        initialize(options: {
          client_id: string;
          nonce?: string;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
          ux_mode?: 'popup' | 'redirect';
          callback: (response: { credential?: string }) => void;
        }): void;
        renderButton(
          parent: HTMLElement,
          options: {
            type?: 'standard' | 'icon';
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            shape?: 'rectangular' | 'pill' | 'circle' | 'square';
            width?: number;
            locale?: string;
          },
        ): void;
        disableAutoSelect(): void;
      };
    };
  };
}

export type NativeGoogleSignInResult =
  | { readonly kind: 'credential'; readonly idToken: string; readonly nonce: string }
  | { readonly kind: 'cancelled' };

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly repository = inject(AUTH_REPOSITORY);
  private readonly nativePlugin = inject(GOOGLE_CREDENTIAL_PLUGIN);

  private configCache: GoogleAuthConfig | null = null;
  private gisLoadPromise: Promise<boolean> | null = null;

  get isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  async loadConfig(forceRefresh = false): Promise<GoogleAuthConfig> {
    if (!forceRefresh && this.configCache) return this.configCache;
    const config = await firstValueFrom(this.repository.getGoogleConfig());
    this.configCache = config;
    return config;
  }

  async createChallenge(purpose: 'AUTH' | 'LINK' | 'REAUTH' = 'AUTH'): Promise<GoogleChallenge> {
    return firstValueFrom(this.repository.createGoogleChallenge(purpose));
  }

  async signInWithAndroid(purpose: 'AUTH' | 'LINK' | 'REAUTH' = 'AUTH'): Promise<NativeGoogleSignInResult> {
    const config = await this.loadConfig();
    if (!config.enabled || !config.webClientId) {
      throw new Error('GOOGLE_NOT_CONFIGURED');
    }
    const challenge = await this.createChallenge(purpose);
    const response = await this.nativePlugin.signIn({
      serverClientId: config.webClientId,
      nonce: challenge.nonce,
    });
    if (response.cancelled) return { kind: 'cancelled' };
    if (!response.idToken) throw new Error('GOOGLE_EMPTY_CREDENTIAL');
    return { kind: 'credential', idToken: response.idToken, nonce: challenge.nonce };
  }

  loadWebGisScript(): Promise<boolean> {
    if (this.isAndroidNative) return Promise.resolve(false);
    const win = window as unknown as GoogleCredentialWindow;
    if (win.google?.accounts?.id) return Promise.resolve(true);
    this.gisLoadPromise ??= new Promise<boolean>((resolve) => {
      if (typeof document === 'undefined') {
        resolve(false);
        return;
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-cmc-google-gis="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(Boolean(win.google?.accounts?.id)), { once: true });
        existing.addEventListener('error', () => {
          this.gisLoadPromise = null;
          resolve(false);
        }, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset['cmcGoogleGis'] = 'true';
      script.onload = () => resolve(Boolean(win.google?.accounts?.id));
      script.onerror = () => {
        this.gisLoadPromise = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return this.gisLoadPromise;
  }

  async clearCredentialState(): Promise<void> {
    if (this.isAndroidNative) {
      try {
        await this.nativePlugin.clearCredentialState();
      } catch {
        // Ignore best-effort credential clearing failure on logout.
      }
      return;
    }
    try {
      const win = window as unknown as GoogleCredentialWindow;
      win.google?.accounts?.id?.disableAutoSelect();
    } catch {
      // Ignore when GIS script is not loaded.
    }
  }
}
