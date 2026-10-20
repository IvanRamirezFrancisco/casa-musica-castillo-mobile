import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { EditProfilePage } from './edit-profile.page';
import { DemoAccountStateService } from '../../../core/services/demo-account-state.service';

describe('EditProfilePage', () => {
  let component: EditProfilePage;
  let fixture: ComponentFixture<EditProfilePage>;
  let accountService: DemoAccountStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditProfilePage],
      providers: [provideRouter([]), DemoAccountStateService]
    }).compileComponents();

    accountService = TestBed.inject(DemoAccountStateService);
    fixture = TestBed.createComponent(EditProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial values from demo profile', () => {
    expect(component.form.value.name).toBe('Usuario Demo');
  });

  it('should validate form and update profile', () => {
    component.form.patchValue({
      name: 'Nuevo Nombre',
      email: 'nuevo@correo.com',
      phone: '1234567890'
    });

    expect(component.form.valid).toBe(true);

    component.save();

    expect(accountService.profile().name).toBe('Nuevo Nombre');
  });

  // HU-14: validación, normalización y campos permitidos
  const intentarGuardar = (valores: { name?: string; email?: string; phone?: string }) => {
    component.form.patchValue(valores);
    component.save();
    fixture.detectChanges();
  };

  it('normaliza nombre, correo y teléfono al guardar (PF-HU14-02)', () => {
    intentarGuardar({ name: '  María   José  López ', email: ' Maria@Correo.MX ', phone: '555-123 4567' });
    expect(accountService.profile()).toEqual({
      name: 'María José López',
      email: 'maria@correo.mx',
      phone: '5551234567',
    });
  });

  it('envía solo los campos permitidos (PS-HU14-02)', () => {
    const update = vi.spyOn(accountService, 'updateProfile');
    intentarGuardar({ name: 'Ana Pérez', email: 'ana@correo.com', phone: '5551112233' });
    expect(Object.keys(update.mock.calls[0][0]).sort()).toEqual(['email', 'name', 'phone']);
  });

  it('regresa al perfil después de guardar', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    intentarGuardar({ name: 'Ana Pérez' });
    expect(navigate).toHaveBeenCalledWith(['/main/profile']);
  });

  it.each([
    ['name', '', 'Ingresa tu nombre completo.'],
    ['name', '   ', 'Ingresa tu nombre completo.'],
    ['name', 'J4n', 'Usa solo letras y espacios (entre 3 y 80 caracteres).'],
    ['name', 'Al', 'Usa solo letras y espacios (entre 3 y 80 caracteres).'],
    ['name', '   Al   ', 'Usa solo letras y espacios (entre 3 y 80 caracteres).'],
    ['name', 'A'.repeat(81), 'Usa solo letras y espacios (entre 3 y 80 caracteres).'],
    ['email', '', 'Ingresa tu correo electrónico.'],
    ['email', 'usuario@correo', 'Ingresa un correo válido, por ejemplo nombre@correo.com.'],
    ['phone', '', 'Ingresa tu teléfono.'],
    ['phone', '12345', 'Ingresa un teléfono de 10 dígitos.'],
  ] as const)('muestra un mensaje específico para %s = "%s" y no guarda (PF-HU14-03)', (campo, valor, mensaje) => {
    const original = { ...accountService.profile() };
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    intentarGuardar({ [campo]: valor });
    expect(component.fieldError(campo)).toBe(mensaje);
    expect(accountService.profile()).toEqual(original);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('muestra los mensajes en la pantalla', () => {
    intentarGuardar({ phone: '12' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ingresa un teléfono de 10 dígitos.');
  });
});
