import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordPage } from './forgot-password.page';
import { provideRouter, Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { PasswordRecoveryService } from '../../../core/services/password-recovery.service';

describe('ForgotPasswordPage', () => {
  let component: ForgotPasswordPage;
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let router: Router;
  let requestReset: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const submitWith = async (email: string) => {
    component.forgotForm.controls.email.setValue(email);
    await component.onSubmit();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    requestReset = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: { back: vi.fn() } },
        { provide: PasswordRecoveryService, useValue: { requestReset } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // PF-HU03-01
  it('envía la solicitud con un correo válido y muestra la confirmación', async () => {
    await submitWith('test@test.com');
    expect(requestReset).toHaveBeenCalledWith('test@test.com');
    expect(component.isSubmitted()).toBe(true);
    expect(root().querySelector('.recovery-confirmation')?.textContent).toContain('test@test.com');
  });

  it('elimina los espacios del correo antes de enviarlo', async () => {
    await submitWith('  cliente@correo.com  ');
    expect(requestReset).toHaveBeenCalledWith('cliente@correo.com');
  });

  // PF-HU03-02 (TT-16)
  it('pide el correo cuando el campo está vacío y no envía la solicitud', async () => {
    await submitWith('');
    expect(requestReset).not.toHaveBeenCalled();
    expect(component.emailError()).toBe('Ingresa tu correo electrónico.');
  });

  it('rechaza un correo sin dominio completo con un mensaje específico', async () => {
    await submitWith('usuario@correo');
    expect(requestReset).not.toHaveBeenCalled();
    expect(component.status()).toBe('idle');
    expect(component.emailError()).toBe('Ingresa un correo válido, por ejemplo nombre@correo.com.');
  });

  // PS-HU03-01
  it('usa un mensaje neutral que no revela si el correo está registrado', async () => {
    await submitWith('cliente@correo.com');
    const texto = root().querySelector('.recovery-confirmation')?.textContent ?? '';
    expect(texto).toContain('Si existe una cuenta asociada a');
    expect(texto).not.toContain('Hemos enviado');
  });

  // PF-HU03-03 (TT-18)
  it('muestra un error controlado sin detalles técnicos cuando falla la solicitud', async () => {
    requestReset.mockRejectedValueOnce(new Error('HTTP 500 /api/auth/password-reset stacktrace'));
    await submitWith('cliente@correo.com');
    expect(component.status()).toBe('error');
    const errorState = root().querySelector('cmc-error-state');
    expect(errorState?.textContent).toContain('No pudimos enviar la solicitud');
    expect(root().textContent).not.toContain('HTTP 500');
    expect(root().textContent).not.toContain('/api/');
  });

  it('permite reintentar después de un error', async () => {
    requestReset.mockRejectedValueOnce(new Error('offline'));
    await submitWith('cliente@correo.com');
    await submitWith('cliente@correo.com');
    expect(requestReset).toHaveBeenCalledTimes(2);
    expect(component.isSubmitted()).toBe(true);
    expect(root().querySelector('cmc-error-state')).toBeNull();
  });

  it('evita enviar la solicitud dos veces mientras está en curso', async () => {
    let resolver!: () => void;
    requestReset.mockReturnValueOnce(new Promise<void>((resolve) => { resolver = resolve; }));
    component.forgotForm.controls.email.setValue('cliente@correo.com');
    const primera = component.onSubmit();
    expect(component.isSending()).toBe(true);
    await component.onSubmit();
    resolver();
    await primera;
    expect(requestReset).toHaveBeenCalledTimes(1);
  });

  it('permite usar otro correo después de la confirmación', async () => {
    await submitWith('cliente@correo.com');
    component.useAnotherEmail();
    fixture.detectChanges();
    expect(component.status()).toBe('idle');
    expect(component.forgotForm.controls.email.value).toBe('');
    expect(root().querySelector('form')).toBeTruthy();
  });

  it('should navigate back to login', () => {
    component.goBackToLogin();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });
});
