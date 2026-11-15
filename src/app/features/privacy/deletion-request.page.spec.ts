import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { AuthService } from '../../core/services/auth.service';
import { DeletionRequestPage } from './deletion-request.page';

describe('DeletionRequestPage', () => {
  const apiBase = 'https://api.example.test';
  let http: HttpTestingController;
  let clearAfterPasswordChange: ReturnType<typeof vi.fn<() => Promise<void>>>;

  beforeEach(() => {
    clearAfterPasswordChange = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideIonicAngular({ animated: false }),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBase },
        { provide: AuthService, useValue: { clearAfterPasswordChange } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function createAndFlushAvailable(available = true) {
    const fixture = TestBed.createComponent(DeletionRequestPage);
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: `${apiBase}/api/public/legal/deletion` }).flush({
      available,
      publicEmailRequestEnabled: true,
      automaticDeletionEnabled: true,
      supportEmail: 'soporte@casamusicacastillo.com',
      tokenValidityMinutes: 30,
      retentionPolicyVersion: 'v2',
    });
    if (available) {
      http.expectOne({ method: 'GET', url: `${apiBase}/api/users/me/deletion-requests` })
        .flush({}, { status: 404, statusText: 'Not Found' });
    }
    fixture.detectChanges();
    return fixture;
  }

  it('muestra qué datos se eliminan vs retención fiscal CFF, enlace web externo y /privacy', () => {
    const fixture = createAndFlushAvailable(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Se elimina de forma permanente');
    expect(el.textContent).toContain('CFF Art. 30');
    expect(el.textContent).toContain('REVIEW_REQUIRED');
    const webLink = el.querySelector<HTMLAnchorElement>('a[href="https://casa-musica-castillo.vercel.app/eliminar-cuenta"]');
    expect(webLink).toBeTruthy();
    expect(webLink?.target).toBe('_blank');
    expect(el.querySelector('a[href="/privacy"]')).toBeTruthy();
  });

  it('conserva la sesión cuando el servidor responde REVIEW_REQUIRED y la limpia al responder COMPLETED', () => {
    const fixture = createAndFlushAvailable(true);
    const component = fixture.componentInstance;

    component.password = 'Synthetic!Pass99';
    component.confirmed = true;
    component.submit();

    const firstReq = http.expectOne({ method: 'POST', url: `${apiBase}/api/users/me/deletion-requests` });
    expect(firstReq.request.body).toEqual({ currentPassword: 'Synthetic!Pass99', confirmed: true });
    firstReq.flush({
      requestId: '11111111-1111-4111-8111-111111111111',
      status: 'REVIEW_REQUIRED',
      receivedAt: '2026-11-15T12:00:00Z',
      completedAt: null,
    });
    fixture.detectChanges();

    expect(clearAfterPasswordChange).not.toHaveBeenCalled();
    expect(component.receipt()?.status).toBe('REVIEW_REQUIRED');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('en revisión operativa');

    component.password = 'Synthetic!Pass99';
    component.confirmed = true;
    component.submit();

    http.expectOne({ method: 'POST', url: `${apiBase}/api/users/me/deletion-requests` }).flush({
      requestId: '22222222-2222-4222-8222-222222222222',
      status: 'COMPLETED',
      receivedAt: '2026-11-15T12:05:00Z',
      completedAt: '2026-11-15T12:05:02Z',
    });
    fixture.detectChanges();

    expect(clearAfterPasswordChange).toHaveBeenCalledOnce();
    expect(component.receipt()?.status).toBe('COMPLETED');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('La eliminación de tu cuenta se completó');
  });

  it('consulta estado por folio UUID sin exponer datos de cuenta y valida formato inválido', () => {
    const fixture = createAndFlushAvailable(true);
    const component = fixture.componentInstance;

    component.lookupRequestId = 'folio-invalido';
    component.lookupStatus();
    expect(component.trackingError()).toContain('folio UUID válido');

    const uuid = '33333333-3333-4333-8333-333333333333';
    component.lookupRequestId = uuid;
    component.lookupStatus();

    const trackReq = http.expectOne({ method: 'POST', url: `${apiBase}/api/public/legal/deletion/status` });
    expect(trackReq.request.body).toEqual({ requestId: uuid });
    trackReq.flush({
      requestId: uuid,
      status: 'RECEIVED',
      receivedAt: '2026-11-15T12:10:00Z',
      completedAt: null,
    });
    fixture.detectChanges();

    expect(component.trackingError()).toBe('');
    expect(component.receipt()?.requestId).toBe(uuid);
    expect(component.receipt()?.status).toBe('RECEIVED');
  });
});
