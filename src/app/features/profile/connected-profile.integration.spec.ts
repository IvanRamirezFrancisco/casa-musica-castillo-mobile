import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { profileDto, testSession } from '../../core/api/auth.testing';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { MemorySessionStore } from '../../core/infrastructure/memory-session.store';
import { authInterceptor } from '../../core/security/auth.interceptor';
import { SESSION_STORE } from '../../core/security/session-store.token';
import { AuthService } from '../../core/services/auth.service';
import { DemoAccountStateService } from '../../core/services/demo-account-state.service';
import { EditProfilePage } from './edit-profile/edit-profile.page';
import { ProfilePage } from './profile.page';

const base = 'https://api.example.test';

describe('perfil real conectado y cierre de sesión (integración)', () => {
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    const store = new MemorySessionStore();
    await store.save(testSession());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideIonicAngular({ animated: false }),
        { provide: API_BASE_URL, useValue: base },
        { provide: BACKEND_SESSION_ENABLED, useValue: true },
        { provide: SESSION_STORE, useValue: store },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    await auth.restore();
  });

  afterEach(() => http.verify());

  it('consulta GET /api/users/profile, muestra identidad, estado 2FA, aviso TT-05 y cierra sesión', () => {
    const page = TestBed.createComponent(ProfilePage);
    page.detectChanges();

    const req = http.expectOne(`${base}/api/users/profile`);
    expect(req.request.headers.get('Authorization')).toContain('Bearer ');
    req.flush({ success: true, message: 'ok', data: profileDto() });
    page.detectChanges();

    const text = page.nativeElement.textContent;
    expect(text).toContain('Ana Pérez');
    expect(text).toContain('ana@gmail.com');
    expect(text).toContain('5512345678');
    expect(text).toContain('Cuenta verificada y activa');
    expect(text).toContain('Activo (Correo, Códigos de respaldo)');
    expect(text).toContain('Si la aplicación se reinicia');
    expect(text).not.toContain('TT-05');

    const view = page.debugElement.children[0].componentInstance;
    const navSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const securityButton = Array.from(page.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(button => button.textContent?.includes('Seguridad de la cuenta'));
    securityButton?.click();
    expect(navSpy).toHaveBeenCalledWith(['/profile/security']);
    const menuButtons=Array.from(page.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    menuButtons.find(button=>button.textContent?.includes('Mis pedidos'))?.click();
    expect(navSpy).toHaveBeenCalledWith(['/main/orders']);
    menuButtons.find(button=>button.textContent?.includes('Mis favoritos'))?.click();
    expect(navSpy).toHaveBeenCalledWith(['/favorites']);
    page.componentInstance.ionViewWillEnter();
    http.expectOne(`${base}/api/users/profile`).flush({success:true,data:profileDto()});
    view.goToEditProfile();
    expect(navSpy).toHaveBeenCalledWith(['/profile/edit']);

    view.logout();
    http.expectOne(`${base}/api/auth/logout`).flush({ success: true });
    page.detectChanges();
    expect(auth.user()).toBeNull();
    expect(view.profile()).toBeNull();
    expect(navSpy).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('mantiene Seguridad accesible también con un proveedor de sesión persistente',()=>{
    Object.defineProperty(auth,'persistent',{value:true});
    const page=TestBed.createComponent(ProfilePage);page.detectChanges();
    http.expectOne(`${base}/api/users/profile`).flush({success:true,data:profileDto()});page.detectChanges();
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const button=Array.from(page.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(button=>button.textContent?.includes('Seguridad de la cuenta'));
    expect(button).toBeTruthy();button!.click();expect(navigate).toHaveBeenCalledWith(['/profile/security']);
    expect(page.nativeElement.textContent).not.toContain('Si la aplicación se reinicia');page.destroy();
  });

  it('aislamiento y errores: rechaza perfil de otro usuario, permite reintentar y documenta edición bloqueada', () => {
    const page = TestBed.createComponent(ProfilePage);
    page.detectChanges();

    http.expectOne(`${base}/api/users/profile`).flush({
      success: true,
      data: profileDto({ id: 999, email: 'intruso@gmail.com', firstName: 'Intruso' }),
    });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('no corresponde a la sesión activa');
    expect(page.nativeElement.textContent).not.toContain('intruso@gmail.com');

    const view = page.debugElement.children[0].componentInstance;
    view.reload();
    http.expectOne(`${base}/api/users/profile`).flush({}, { status: 500, statusText: 'Error' });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('No pudimos cargar tu perfil');

    view.reload();
    http.expectOne(`${base}/api/users/profile`).flush({
      success: true,
      data: profileDto({ twoFactorEnabled: false, phone: null }),
    });
    page.detectChanges();
    expect(page.nativeElement.textContent).toContain('Sin teléfono registrado');
    expect(page.nativeElement.textContent).toContain('2FA desactivado');

    const editPage = TestBed.createComponent(EditProfilePage);
    editPage.detectChanges();
    expect(editPage.nativeElement.textContent).toContain('Actualización de datos no disponible');
    expect(editPage.nativeElement.textContent).not.toContain('/api/');
    expect(editPage.nativeElement.querySelector('form')).toBeNull();
    const originalDemoProfile = { ...TestBed.inject(DemoAccountStateService).profile() };
    editPage.componentInstance.save();
    expect(TestBed.inject(DemoAccountStateService).profile()).toEqual(originalDemoProfile);
    http.expectNone(request => ['PUT', 'PATCH', 'POST'].includes(request.method));
    const back = vi.spyOn(TestBed.inject(NavController), 'navigateBack').mockResolvedValue(true);
    editPage.componentInstance.goBack();
    expect(back).toHaveBeenCalledWith(['/main/profile']);
  });
});
