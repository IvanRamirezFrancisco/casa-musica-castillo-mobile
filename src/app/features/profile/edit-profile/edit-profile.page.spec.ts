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
    component.form.patchValue({
      name: 'Nuevo Nombre',
      email: 'nuevo@correo.com',
      phone: '1234567890'
    });

    expect(component.form.valid).toBe(true);

    component.save();

    expect(accountService.profile().name).toBe('Nuevo Nombre');
  });
});
