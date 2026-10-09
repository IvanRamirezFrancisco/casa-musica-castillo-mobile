import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordPage } from './forgot-password.page';
import { provideRouter, Router } from '@angular/router';
import { NavController } from '@ionic/angular';

describe('ForgotPasswordPage', () => {
  let component: ForgotPasswordPage;
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: { back: vi.fn() } }
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

  it('should set isSubmitted to true on valid submit', () => {
    component.forgotForm.controls.email.setValue('test@test.com');
    component.onSubmit();
    expect(component.isSubmitted()).toBe(true);
  });

  it('should navigate back to login', () => {
    component.goBackToLogin();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });
});
