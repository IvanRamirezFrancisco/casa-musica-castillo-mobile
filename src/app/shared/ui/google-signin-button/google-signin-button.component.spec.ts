import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../../../core/api/api-error';
import { GOOGLE_AUTH_AUTO_CONFIG } from '../../../core/config/google-auth-config.token';
import { GoogleCredentialWindow, GoogleIdentityService, NativeGoogleSignInResult } from '../../../core/services/google-identity.service';
import { GoogleSigninButtonComponent, describeGoogleError } from './google-signin-button.component';

@Component({
  standalone: true,
  imports: [GoogleSigninButtonComponent],
  template: `
    <app-google-signin-button
      [purpose]="purpose()"
      [disabled]="disabled()"
      (credential)="credentials.push($event)"
      (cancelled)="cancelledCount = cancelledCount + 1"
      (failed)="failures.push($event)"
    />
  `,
})
class HostComponent {
  readonly purpose = signal<'AUTH' | 'LINK' | 'REAUTH'>('LINK');
  readonly disabled = signal(false);
  readonly credentials: Array<{ readonly idToken: string; readonly nonce: string }> = [];
  cancelledCount = 0;
  readonly failures: string[] = [];
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('GoogleSigninButtonComponent — diferenciación de errores y reintentos', () => {
  let identityMock: {
    isAndroidNative: boolean;
    loadConfig: ReturnType<typeof vi.fn>;
    loadWebGisScript: ReturnType<typeof vi.fn>;
    createChallenge: ReturnType<typeof vi.fn>;
    signInWithAndroid: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    identityMock = {
      isAndroidNative: false,
      loadConfig: vi.fn().mockResolvedValue({ enabled: true, webClientId: '123-web.apps.googleusercontent.com' }),
      loadWebGisScript: vi.fn().mockResolvedValue(true),
      createChallenge: vi.fn().mockResolvedValue({ nonce: 'nonce-ok-1234567890', expiresInSeconds: 300 }),
      signInWithAndroid: vi.fn<() => Promise<NativeGoogleSignInResult>>(),
    };
    (window as unknown as GoogleCredentialWindow).google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
          disableAutoSelect: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    delete (window as unknown as GoogleCredentialWindow).google;
    vi.restoreAllMocks();
  });

  function createHost(disabled = false) {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: GOOGLE_AUTH_AUTO_CONFIG, useValue: true },
        { provide: GoogleIdentityService, useValue: identityMock },
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled.set(disabled);
    fixture.detectChanges();
    return fixture;
  }

  it('distingue HTTP 404 en /authenticated-challenge, mantiene habilitado reintentar aun con disabled=true y recupera en reintento', async () => {
    identityMock.createChallenge
      .mockRejectedValueOnce(new ApiError('http', 404, 'No static resource api/auth/google/authenticated-challenge.'))
      .mockResolvedValueOnce({ nonce: 'nonce-retry-ok-123456', expiresInSeconds: 300 });

    const fixture = createHost(true);
    await flushMicrotasks();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const alertText = el.querySelector('[role="alert"]')?.textContent?.trim() ?? '';
    expect(alertText).toContain('HTTP 404');
    expect(alertText).not.toContain('No fue posible cargar el selector oficial de Google');

    const retryBtn = el.querySelector<HTMLButtonElement>('button.google-retry-link');
    expect(retryBtn).toBeTruthy();
    expect(retryBtn!.disabled).toBe(false);

    retryBtn!.click();
    await flushMicrotasks();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector('.google-gis-shell')).toBeTruthy();
  });

  it('muestra mensajes claros para servidor desconectado (0), JWT expirado (401), 403, 409 y 500 sin exponer tokens', async () => {
    const cases: Array<[unknown, string]> = [
      [new ApiError('connection', 0, 'Network down'), 'No se pudo conectar con el servidor'],
      [new ApiError('http', 401, 'JWT expired'), 'Tu sesión expiró'],
      [new ApiError('http', 403, 'Forbidden'), 'No tienes permiso'],
      [new ApiError('http', 409, 'Cuenta ya asociada a otro usuario.'), 'Cuenta ya asociada'],
      [new ApiError('http', 500, 'Internal Error'), 'El servidor no pudo preparar la verificación con Google'],
    ];

    for (const [error, expected] of cases) {
      identityMock.createChallenge.mockRejectedValueOnce(error);
      const fixture = createHost(false);
      await flushMicrotasks();
      fixture.detectChanges();

      const alertText = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent?.trim() ?? '';
      expect(alertText).toContain(expected);
      expect(alertText).not.toMatch(/eyJ|Bearer/i);
      TestBed.resetTestingModule();
    }
  });

  it('conserva el mensaje de selector oficial cuando realmente falla la carga de GIS web', async () => {
    identityMock.loadWebGisScript.mockResolvedValueOnce(false);

    const fixture = createHost(false);
    await flushMicrotasks();
    fixture.detectChanges();

    const alertText = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent?.trim() ?? '';
    expect(alertText).toBe('No fue posible cargar el selector oficial de Google en este momento.');
  });

  it('flujo nativo Android emite cancelled, distingue 404/401 y sanea errores sensibles de Credential Manager', async () => {
    identityMock.isAndroidNative = true;
    const fixture = createHost(false);
    await flushMicrotasks();
    fixture.detectChanges();

    const nativeBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.google-native-btn');
    expect(nativeBtn).toBeTruthy();

    // 1. Cancelación del usuario
    identityMock.signInWithAndroid.mockResolvedValueOnce({ kind: 'cancelled' });
    nativeBtn!.click();
    await flushMicrotasks();
    expect(fixture.componentInstance.cancelledCount).toBe(1);
    expect(fixture.componentInstance.failures).toHaveLength(0);

    // 2. Backend HTTP 404 y 401
    identityMock.signInWithAndroid.mockRejectedValueOnce(new ApiError('http', 404));
    nativeBtn!.click();
    await flushMicrotasks();
    identityMock.signInWithAndroid.mockRejectedValueOnce(new ApiError('http', 401));
    nativeBtn!.click();
    await flushMicrotasks();

    // 3. Error de Credential Manager con token potencialmente sensible -> saneado
    identityMock.signInWithAndroid.mockRejectedValueOnce(new Error('Bearer eyJhbGciOiJSUzI1NiJ9.secret'));
    nativeBtn!.click();
    await flushMicrotasks();

    expect(fixture.componentInstance.failures[0]).toContain('HTTP 404');
    expect(fixture.componentInstance.failures[1]).toContain('Tu sesión expiró');
    expect(fixture.componentInstance.failures[2]).toContain('Credential Manager');
    expect(fixture.componentInstance.failures[2]).not.toMatch(/eyJ|Bearer/i);

    expect(describeGoogleError(new Error('GOOGLE_NOT_CONFIGURED'), 'native')).toContain('no está configurado');
    expect(describeGoogleError(new Error('GOOGLE_EMPTY_CREDENTIAL'), 'native')).toContain('credencial válida');
  });
});
