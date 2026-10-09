import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPage } from './login.page';
import { provideRouter, Router } from '@angular/router';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to home on valid submit', () => {
    component.loginForm.controls.email.setValue('test@test.com');
    component.loginForm.controls.password.setValue('123456');
    component.onSubmit();
    expect(router.navigate).toHaveBeenCalledWith(['/main/home'], { replaceUrl: true });
  });

  it('should not navigate on invalid submit', () => {
    component.loginForm.controls.email.setValue('invalid');
    component.onSubmit();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
