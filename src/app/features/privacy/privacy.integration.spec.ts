import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideIonicAngular } from '@ionic/angular';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { profileDto, testSession } from '../../core/api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { MemorySessionStore } from '../../core/infrastructure/memory-session.store';
import { PRIVACY_PREFERENCE_STORAGE } from '../../core/infrastructure/browser-privacy-preferences.repository';
import { authInterceptor } from '../../core/security/auth.interceptor';
import { SESSION_STORE } from '../../core/security/session-store.token';
import { AuthService } from '../../core/services/auth.service';
import { PrivacyPreferencesService } from '../../core/services/privacy-preferences.service';
import { routes } from '../../app.routes';
import { ConnectedProfileComponent } from '../profile/connected-profile.view';
import { ProfilePage } from '../profile/profile.page';
import { MyPrivacyDataPage } from './my-data.page';
import { PrivacyPage } from './privacy.page';

const base = 'https://api.example.test';
async function setup(connected = true, signedIn = true) {
  const store = new MemorySessionStore();
  const session = testSession();
  if (signedIn) await store.save(session);
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  TestBed.configureTestingModule({ providers: [provideRouter(routes), provideIonicAngular({ animated: false }),
    provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: base }, { provide: BACKEND_SESSION_ENABLED, useValue: connected },
    { provide: SESSION_STORE, useValue: store }, { provide: PRIVACY_PREFERENCE_STORAGE, useValue: storage }] });
  const auth = TestBed.inject(AuthService); await auth.restore();
  return { http: TestBed.inject(HttpTestingController), auth, storage, session };
}
afterEach(() => TestBed.inject(HttpTestingController).verify());

describe('privacidad: controles accesibles y comportamiento real', () => {
  it('permite consultar información sin sesión ni tráfico HTTP y protege los datos propios', async () => {
    const { http } = await setup(true, false);
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/privacy', PrivacyPage);
    expect(page.preferences.hideContact()).toBe(false);
    expect(harness.routeNativeElement?.querySelector('h2')?.id).toBe('privacy-info');
    const label = harness.routeNativeElement!.querySelector('label')!;
    expect(label.htmlFor).toBe('hide-contact');
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('#hide-contact')!;
    expect(input.type).toBe('checkbox'); expect(input.checked).toBe(false);
    expect(harness.routeNativeElement!.querySelector('#'+input.getAttribute('aria-describedby'))).toBeTruthy();
    expect(harness.routeNativeElement!.querySelectorAll('input')).toHaveLength(1);
    expect(harness.routeNativeElement!.textContent).toContain('no registra un consentimiento');
    expect(harness.routeNativeElement!.querySelector('a[href="/privacy/my-data"]')).toBeTruthy();
    const guard = routes.find(r => r.path === 'privacy/my-data')!.canActivate!;
    expect(guard).toHaveLength(1);
    http.expectNone(() => true);
  });
  it('la elección oculta contactos del perfil conectado sin dejarlos en DOM o atributos', async () => {
    const { http } = await setup();
    const preferences = TestBed.inject(PrivacyPreferencesService);
    const page = TestBed.createComponent(PrivacyPage); page.detectChanges();
    const checkbox = page.nativeElement.querySelector('#hide-contact') as HTMLInputElement;
    checkbox.click(); page.detectChanges();
    expect(preferences.hideContact()).toBe(true);
    expect(page.nativeElement.querySelector('[role="status"]').textContent).toContain('guardada');
    page.destroy();
    const profile = TestBed.createComponent(ConnectedProfileComponent); profile.detectChanges();
    http.expectOne(base+'/api/users/profile').flush({ success: true, data: profileDto() }); profile.detectChanges();
    expect(profile.nativeElement.innerHTML).not.toContain('ana@gmail.com');
    expect(profile.nativeElement.innerHTML).not.toContain('5512345678');
    expect(profile.nativeElement.textContent).toContain('Correo oculto');
    profile.destroy();
    // Each screen has its own attached fixture, matching navigation rather than clicking a detached input.
    const privacyAgain = TestBed.createComponent(PrivacyPage); privacyAgain.detectChanges();
    (privacyAgain.nativeElement.querySelector('#hide-contact') as HTMLInputElement).click(); privacyAgain.detectChanges();
    expect(preferences.hideContact()).toBe(false);
    privacyAgain.destroy();
    const profileAgain = TestBed.createComponent(ConnectedProfileComponent); profileAgain.detectChanges();
    http.expectOne(base+'/api/users/profile').flush({ success: true, data: profileDto() }); profileAgain.detectChanges();
    expect(profileAgain.nativeElement.textContent).toContain('ana@gmail.com');
    expect(profileAgain.nativeElement.querySelector('a[href="/privacy"]')).toBeTruthy();
  });
  it('restaura checkbox y anuncia fallo si no se puede confirmar el guardado', async () => {
    const { storage } = await setup();
    const page = TestBed.createComponent(PrivacyPage); page.detectChanges();
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const checkbox = page.nativeElement.querySelector('#hide-contact') as HTMLInputElement;
    checkbox.click(); page.detectChanges();
    expect(checkbox.checked).toBe(false);
    expect(page.nativeElement.querySelector('[role="alert"]').textContent).toContain('No pudimos confirmar');
  });
  it('aplica la misma preferencia al perfil DEMO sin HTTP', async () => {
    const { http } = await setup(false, false);
    TestBed.inject(PrivacyPreferencesService).setHideContact(true);
    const page = TestBed.createComponent(ProfilePage); page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Usuario Demo');
    expect(page.nativeElement.textContent).toContain('Teléfono oculto');
    expect(page.nativeElement.querySelector('a[href="/privacy"]')).toBeTruthy();
    http.expectNone(() => true);
  });
});

describe('acceso propio mediante contrato HTTP existente', () => {
  it('redirige acceso directo sin sesión a login con retorno interno y sin consultar datos', async () => {
    const { http } = await setup(true, false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/privacy/my-data');
    const { Router } = await import('@angular/router');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fprivacy%2Fmy-data');
    expect(harness.routeNativeElement?.textContent).not.toContain('Ana Pérez');
    http.expectNone(() => true);
  });
  it('muestra carga, consulta GET propio con Bearer, sin body/IDs ajenos ni JWT en vista', async () => {
    const { http, session } = await setup();
    const page = TestBed.createComponent(MyPrivacyDataPage); page.detectChanges();
    expect(page.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(page.nativeElement.querySelector('[role="status"]').textContent).toContain('Consultando');
    const request = http.expectOne(base+'/api/users/profile');
    expect(request.request.method).toBe('GET'); expect(request.request.body).toBeNull();
    expect(request.request.headers.get('Authorization')).toBe('Bearer '+session.token);
    request.flush({ success: true, data: profileDto() }); page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Ana Pérez');
    expect(page.nativeElement.innerHTML).not.toContain(session.token);
    expect(page.nativeElement.textContent).toContain('No incluye una copia integral');
  });
  it('no muestra respuestas de otra cuenta y permite reintentar', async () => {
    const { http } = await setup();
    const page = TestBed.createComponent(MyPrivacyDataPage); page.detectChanges();
    http.expectOne(base+'/api/users/profile').flush({ success: true, data: profileDto({ id: 999, email: 'other@example.test' }) }); page.detectChanges();
    expect(page.nativeElement.textContent).not.toContain('other@example.test');
    expect(page.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    page.componentInstance.data.load(); http.expectOne(base+'/api/users/profile').flush({ success: true, data: profileDto({ phone: null, createdAt: null, updatedAt: null, twoFactorEnabled: false, enabled: false }) }); page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Sin teléfono registrado');
    expect(page.nativeElement.textContent).toContain('Desactivado');
    expect(page.nativeElement.textContent).toContain('No disponible');
  });
  it('maneja errores sin reproducir mensajes o datos del servidor', async () => {
    const { http } = await setup();
    const page = TestBed.createComponent(MyPrivacyDataPage); page.detectChanges();
    http.expectOne(base+'/api/users/profile').flush({ message: 'private-backend-detail' }, { status: 500, statusText: 'Server' }); page.detectChanges();
    expect(page.nativeElement.textContent).not.toContain('private-backend-detail');
    expect(page.nativeElement.querySelector('[role="alert"]').textContent).toContain('reintentar');
    expect(page.componentInstance.data.loading()).toBe(false);
  });
  it('cancela peticiones y descarta datos al cerrar sesión o destruir la pantalla', async () => {
    const { http, auth } = await setup();
    const page = TestBed.createComponent(MyPrivacyDataPage); page.detectChanges();
    const request = http.expectOne(base+'/api/users/profile');
    auth.handleUnauthorized(false);
    expect(request.cancelled).toBe(true); expect(page.componentInstance.data.profile()).toBeNull();
    page.componentInstance.data.load(); expect(page.componentInstance.data.error()).toContain('Inicia sesión');
    http.expectNone(base+'/api/users/profile'); page.destroy();
  });
  it('limpia el perfil anterior al actualizar y cancela la nueva consulta al salir', async () => {
    const { http } = await setup();
    const page = TestBed.createComponent(MyPrivacyDataPage); page.detectChanges();
    http.expectOne(base+'/api/users/profile').flush({ success: true, data: profileDto() }); page.detectChanges();
    expect(page.nativeElement.textContent).toContain('ana@gmail.com');
    page.componentInstance.data.load(); page.detectChanges();
    expect(page.nativeElement.textContent).not.toContain('ana@gmail.com');
    const pending = http.expectOne(base+'/api/users/profile');
    page.destroy(); expect(pending.cancelled).toBe(true);
  });
  it('un 401 termina la sesión y no filtra el perfil anterior', async () => {
    const { http, auth } = await setup();
    const page = TestBed.createComponent(MyPrivacyDataPage); page.detectChanges();
    http.expectOne(base+'/api/users/profile').flush({}, { status: 401, statusText: 'Unauthorized' }); page.detectChanges();
    expect(auth.user()).toBeNull(); expect(page.componentInstance.data.profile()).toBeNull(); expect(page.componentInstance.data.loading()).toBe(false);
  });
  it('descarta datos al salir de una página cacheada por Ionic y consulta de nuevo al regresar', async () => {
    const { http } = await setup();
    const page = TestBed.createComponent(MyPrivacyDataPage); page.detectChanges();
    http.expectOne(base+'/api/users/profile').flush({ success: true, data: profileDto() });
    page.componentInstance.ionViewWillEnter(); http.expectNone(base+'/api/users/profile');
    page.componentInstance.ionViewWillLeave(); page.detectChanges();
    expect(page.nativeElement.textContent).not.toContain('ana@gmail.com');
    page.componentInstance.ionViewWillEnter();
    http.expectOne(base+'/api/users/profile').flush({ success: true, data: profileDto() }); page.detectChanges();
    expect(page.nativeElement.textContent).toContain('ana@gmail.com');
  });
  it('DEMO no consulta API ni simula acceso real o eliminación', async () => {
    const { http } = await setup(false, false);
    const page = TestBed.createComponent(MyPrivacyDataPage); page.detectChanges();
    expect(page.nativeElement.textContent).toContain('DEMO no consulta');
    expect(page.nativeElement.querySelector('button')).toBeNull();
    http.expectNone(() => true);
  });
});
