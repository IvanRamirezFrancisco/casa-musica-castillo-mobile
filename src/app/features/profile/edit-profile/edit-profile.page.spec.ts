import { BACKEND_SESSION_ENABLED } from '../../../core/config/backend-session.token';
import { NavController } from '@ionic/angular';
import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
    const back = vi.spyOn(TestBed.inject(NavController), 'navigateBack').mockResolvedValue(true);
    component.form.patchValue({
      name: 'Nuevo Nombre',
      email: 'nuevo@correo.com',
      phone: '1234567890'
    });

    expect(component.form.valid).toBe(true);

    component.save();

    expect(accountService.profile().name).toBe('Nuevo Nombre');
    expect(back).toHaveBeenCalledWith(['/main/profile']);
  });
  it('usa dirección Ionic back hacia /main/profile', () => {
    const back = vi.spyOn(TestBed.inject(NavController), 'navigateBack').mockResolvedValue(true);
    component.goBack();
    expect(back).toHaveBeenCalledWith(['/main/profile']);
  });
  it('normaliza únicamente campos permitidos en DEMO y conserva navegación síncrona', () => {
    const update = vi.spyOn(accountService, 'updateProfile');
    const back = vi.spyOn(TestBed.inject(NavController), 'navigateBack').mockResolvedValue(true);
    component.form.setValue({ name: " Ana   M. O'Brien ", email: ' ANA@CORREO.COM ', phone: '55-1234-5678' });
    component.save();
    expect(update).toHaveBeenCalledWith({ name: "Ana M. O'Brien", email: 'ana@correo.com', phone: '5512345678' });
    expect(back).toHaveBeenCalledOnce();
  });
  it.each([
    { name: 'Ana...--María', email: 'ana@correo.com', phone: '5512345678' },
    { name: 'Ana María', email: '.ana@correo.com', phone: '5512345678' },
    { name: 'Ana María', email: 'ana@correo.com', phone: '---1-2-3-4-5-6-7-8-9-0---' },
    { name: 'Ana María', email: 'ana@correo.com', phone: '  ' },
  ])('no guarda entradas inválidas ni navega: %j', (value) => {
    const update = vi.spyOn(accountService, 'updateProfile');
    const back = vi.spyOn(TestBed.inject(NavController), 'navigateBack');
    component.form.setValue(value); component.save(); fixture.detectChanges();
    expect(update).not.toHaveBeenCalled(); expect(back).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
    expect(fixture.nativeElement.querySelector('[aria-invalid=true]')).toBeTruthy();
  });
  it('distingue errores vacíos, de formato y estado sin tocar para cada campo', () => {
    for (const field of ['name', 'email', 'phone'] as const) {
      expect(component.fieldError(field)).toBe('');
      component.form.controls[field].setValue(' '); component.form.controls[field].markAsTouched();
      expect(component.fieldError(field)).toContain('Ingresa');
      component.form.controls[field].setValue('!');
      expect(component.fieldError(field)).not.toBe('');
    }
  });
  it('el modo conectado no ofrece formulario ni escribe datos DEMO incluso si se invoca save', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [EditProfilePage], providers: [provideRouter([]),
      { provide: BACKEND_SESSION_ENABLED, useValue: true }] });
    const connected = TestBed.createComponent(EditProfilePage); connected.detectChanges();
    const update = vi.spyOn(TestBed.inject(DemoAccountStateService), 'updateProfile');
    connected.componentInstance.save();
    expect(update).not.toHaveBeenCalled(); expect(connected.nativeElement.querySelector('form')).toBeNull();
    expect(connected.nativeElement.textContent).toContain('Actualización de datos no disponible');
  });

});
