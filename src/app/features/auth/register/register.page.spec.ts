import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterPage } from './register.page';
import { provideRouter, Router } from '@angular/router';
import { NavController } from '@ionic/angular';

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: { back: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should invalidate when passwords do not match', () => {
    component.registerForm.patchValue({
      name: 'John',
      email: 'john@test.com',
      phone: '1234567890',
      password: 'password123',
      confirmPassword: 'password321'
    });
    expect(component.registerForm.valid).toBe(false);
    expect(component.registerForm.errors?.['passwordMismatch']).toBe(true);
  });

  it('should navigate to login on valid submit', () => {
    component.registerForm.patchValue({
      name: 'John',
      email: 'john@test.com',
      phone: '1234567890',
      password: 'password123',
      confirmPassword: 'password123'
    });
    component.onSubmit();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });
});
