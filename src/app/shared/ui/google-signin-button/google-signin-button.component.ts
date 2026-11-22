import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ApiError } from '../../../core/api/api-error';
import { describeApiError } from '../../../core/api/api-error-message';
import { GOOGLE_AUTH_AUTO_CONFIG } from '../../../core/config/google-auth-config.token';
import { GoogleCredentialWindow, GoogleIdentityService } from '../../../core/services/google-identity.service';

type GisIdClient = NonNullable<NonNullable<NonNullable<GoogleCredentialWindow['google']>['accounts']>['id']>;

@Component({
  selector: 'app-google-signin-button',
  templateUrl: './google-signin-button.component.html',
  styleUrl: './google-signin-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleSigninButtonComponent implements AfterViewInit {
  private readonly googleIdentity = inject(GoogleIdentityService);
  private readonly autoConfig = inject(GOOGLE_AUTH_AUTO_CONFIG);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly context = input<'signin' | 'signup' | 'use'>('use');
  readonly purpose = input<'AUTH' | 'LINK' | 'REAUTH'>('AUTH');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly disabledHint = input('');
  readonly label = input('Continuar con Google');

  readonly credential = output<{ readonly idToken: string; readonly nonce: string }>();
  readonly cancelled = output<void>();
  readonly failed = output<string>();

  protected readonly status = signal<'idle' | 'loading' | 'ready' | 'unconfigured' | 'unavailable'>('idle');
  protected readonly errorMessage = signal('');
  protected readonly busy = signal(false);
  protected readonly isAndroidNative = this.googleIdentity.isAndroidNative;

  private readonly gisHost = viewChild<ElementRef<HTMLDivElement>>('gisHost');

  private destroyed = false;
  private activeNonce: string | null = null;
  private configuredWebClientId: string | null = null;
  private previousDisabled = false;
  private rearmPending = false;
  private renderedWidth = 0;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.activeNonce = null;
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });

    effect(() => {
      const nowDisabled = this.disabled();
      const nowLoading = this.loading();
      if (
        this.previousDisabled
        && !nowDisabled
        && !nowLoading
        && !this.isAndroidNative
        && this.configuredWebClientId
        && this.status() === 'ready'
        && !this.rearmPending
      ) {
        if (this.activeNonce === null) {
          this.rearmPending = true;
          void this.renderWebGisButton().finally(() => {
            this.rearmPending = false;
          });
        } else {
          const hostEl = this.gisHost()?.nativeElement;
          const gisId = (window as unknown as GoogleCredentialWindow).google?.accounts?.id;
          if (hostEl && gisId) {
            queueMicrotask(() => {
              if (this.destroyed || !this.activeNonce || !this.configuredWebClientId) return;
              const available = this.measureAvailableWidth(hostEl);
              if (Math.abs(available - this.renderedWidth) > 16) {
                this.paintGisButton(this.configuredWebClientId, hostEl, gisId, this.activeNonce);
              }
            });
          }
        }
      }
      this.previousDisabled = nowDisabled;
    });
  }

  ngAfterViewInit(): void {
    this.observeHostResize();
    if (!this.autoConfig) return;
    void this.initializeWidget();
  }

  private observeHostResize(): void {
    if (this.isAndroidNative || typeof ResizeObserver === 'undefined') return;
    const hostEl = this.gisHost()?.nativeElement;
    if (!hostEl) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (
        this.destroyed
        || this.disabled()
        || this.loading()
        || this.busy()
        || this.status() !== 'ready'
        || !this.configuredWebClientId
        || !this.activeNonce
      ) {
        return;
      }
      const gisId = (window as unknown as GoogleCredentialWindow).google?.accounts?.id;
      if (!gisId || hostEl.clientWidth === 0) return;
      const available = this.measureAvailableWidth(hostEl);
      if (Math.abs(available - this.renderedWidth) > 16) {
        this.paintGisButton(this.configuredWebClientId, hostEl, gisId, this.activeNonce);
      }
    });
    this.resizeObserver.observe(hostEl.parentElement ?? hostEl);
  }

  async refreshChallenge(): Promise<void> {
    if (
      this.destroyed
      || this.isAndroidNative
      || !this.configuredWebClientId
      || this.status() !== 'ready'
      || this.rearmPending
    ) {
      return;
    }
    this.rearmPending = true;
    try {
      await this.renderWebGisButton();
    } finally {
      this.rearmPending = false;
    }
  }

  protected retrySetup(): void {
    if (this.busy()) return;
    this.errorMessage.set('');
    void this.initializeWidget();
  }

  async triggerNativeSignIn(): Promise<void> {
    if (this.disabled() || this.busy() || !this.isAndroidNative) return;
    this.busy.set(true);
    try {
      const result = await this.googleIdentity.signInWithAndroid(this.purpose());
      if (this.destroyed) return;
      if (result.kind === 'cancelled') {
        this.cancelled.emit();
        return;
      }
      this.credential.emit({ idToken: result.idToken, nonce: result.nonce });
    } catch (error) {
      if (this.destroyed) return;
      this.failed.emit(describeGoogleError(error, 'native'));
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
  }

  private async initializeWidget(): Promise<void> {
    this.errorMessage.set('');
    this.status.set('loading');
    try {
      const config = await this.googleIdentity.loadConfig();
      if (this.destroyed) return;
      if (!config.enabled || !config.webClientId) {
        this.configuredWebClientId = null;
        this.status.set('unconfigured');
        return;
      }
      this.configuredWebClientId = config.webClientId;

      if (this.isAndroidNative) {
        this.status.set('ready');
        return;
      }

      const loaded = await this.googleIdentity.loadWebGisScript();
      if (this.destroyed) return;
      if (!loaded) {
        this.errorMessage.set(describeGoogleError(null, 'gis'));
        this.status.set('unavailable');
        return;
      }
      await this.renderWebGisButton();
    } catch (error) {
      if (!this.destroyed) {
        this.errorMessage.set(describeGoogleError(error, 'config'));
        this.status.set('unavailable');
      }
    }
  }

  private async renderWebGisButton(): Promise<void> {
    const clientId = this.configuredWebClientId;
    const hostEl = this.gisHost()?.nativeElement;
    const gisId = (window as unknown as GoogleCredentialWindow).google?.accounts?.id;
    if (!clientId || !hostEl || !gisId) {
      if (!this.destroyed) {
        this.errorMessage.set(describeGoogleError(null, 'gis'));
        this.status.set('unavailable');
      }
      return;
    }

    try {
      const challenge = await this.googleIdentity.createChallenge(this.purpose());
      if (this.destroyed) return;
      this.activeNonce = challenge.nonce;
      this.errorMessage.set('');
      this.status.set('ready');
      this.paintGisButton(clientId, hostEl, gisId, challenge.nonce);
      queueMicrotask(() => {
        if (this.destroyed || !this.activeNonce || !this.configuredWebClientId) return;
        const available = this.measureAvailableWidth(hostEl);
        if (Math.abs(available - this.renderedWidth) > 8) {
          this.paintGisButton(this.configuredWebClientId, hostEl, gisId, this.activeNonce);
        }
      });
    } catch (error) {
      this.activeNonce = null;
      if (!this.destroyed) {
        this.errorMessage.set(describeGoogleError(error, 'challenge'));
        this.status.set('unavailable');
      }
    }
  }

  private measureAvailableWidth(hostEl: HTMLElement): number {
    const measured = hostEl.parentElement?.clientWidth || hostEl.clientWidth || 0;
    if (measured > 0) {
      return Math.max(200, Math.min(400, Math.round(measured)));
    }
    const viewportCap = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth - 56 : 320;
    return Math.max(200, Math.min(400, viewportCap));
  }

  private paintGisButton(
    clientId: string,
    hostEl: HTMLElement,
    gisId: GisIdClient,
    nonce: string,
  ): void {
    gisId.initialize({
      client_id: clientId,
      nonce,
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: 'popup',
      callback: (response) => {
        this.ngZone.run(() => this.handleWebCredential(response));
      },
    });

    const buttonWidth = this.measureAvailableWidth(hostEl);
    this.renderedWidth = buttonWidth;
    hostEl.replaceChildren();
    gisId.renderButton(hostEl, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: mapContextToGisText(this.context()),
      shape: 'rectangular',
      width: buttonWidth,
      locale: 'es',
    });
  }

  private handleWebCredential(response: { credential?: string }): void {
    if (this.destroyed || this.disabled() || this.busy()) return;
    const idToken = typeof response?.credential === 'string' ? response.credential.trim() : '';
    const nonce = this.activeNonce;
    this.activeNonce = null;
    if (!idToken || !nonce) {
      this.cancelled.emit();
      return;
    }
    this.credential.emit({ idToken, nonce });
  }
}

function mapContextToGisText(context: 'signin' | 'signup' | 'use'): 'signin_with' | 'signup_with' | 'continue_with' {
  switch (context) {
    case 'signin':
      return 'signin_with';
    case 'signup':
      return 'signup_with';
    default:
      return 'continue_with';
  }
}

const SENSITIVE_ERROR_PATTERN = /\b(?:HTTP|Bearer|token|exception|stack)\b|eyJ/i;

export function describeGoogleError(error: unknown, phase: 'config' | 'challenge' | 'gis' | 'native'): string {
  if (error instanceof ApiError) {
    if (error.kind === 'connection' || error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión y que el backend esté activo, e inténtalo de nuevo.';
    }
    if (error.status === 404) {
      return 'El servidor activo no tiene disponible este servicio de Google (HTTP 404). Actualiza o reinicia el backend e inténtalo de nuevo.';
    }
    if (error.status === 401) {
      return 'Tu sesión expiró o no es válida. Inicia sesión de nuevo para continuar con Google.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para realizar esta verificación con Google en esta sesión.';
    }
    if (error.status === 409) {
      return error.serverMessage ?? 'Existe un conflicto con la cuenta de Google seleccionada.';
    }
    if (error.status === 429) {
      return describeApiError(error, 'form');
    }
    if (error.status >= 500) {
      return 'El servidor no pudo preparar la verificación con Google en este momento. Inténtalo más tarde.';
    }
    if (error.kind === 'invalid-response') {
      return 'El servidor devolvió una respuesta inesperada al preparar Google Sign-In. Inténtalo de nuevo.';
    }
    return describeApiError(error, 'form');
  }

  if (phase === 'native') {
    if (error instanceof Error) {
      if (error.message === 'GOOGLE_NOT_CONFIGURED') {
        return 'Google Sign-In no está configurado en este entorno.';
      }
      if (error.message === 'GOOGLE_EMPTY_CREDENTIAL') {
        return 'Google no devolvió una credencial válida. Inténtalo de nuevo.';
      }
      const trimmed = error.message.trim();
      if (trimmed.length > 0 && trimmed.length <= 180 && !SENSITIVE_ERROR_PATTERN.test(trimmed)) {
        return trimmed;
      }
    }
    return 'No se pudo abrir el selector oficial de cuentas de Google (Credential Manager). Verifica los servicios de Google e inténtalo de nuevo.';
  }

  if (phase === 'gis') {
    return 'No fue posible cargar el selector oficial de Google en este momento.';
  }

  return 'No fue posible preparar la verificación con Google en este momento. Inténtalo de nuevo.';
}
