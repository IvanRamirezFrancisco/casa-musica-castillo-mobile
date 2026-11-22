import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideIonicAngular } from '@ionic/angular';
import { API_BASE_URL } from '../../../core/api/api-base-url.token';
import { BACKEND_SESSION_ENABLED } from '../../../core/config/backend-session.token';
import { ConnectedForgotPasswordPage } from './connected-forgot-password.page';

@Component({ template: '' }) class LoginDestinationComponent {}
const base = 'https://api.example.test';
const token = 'synthetic_link_12345678901234567890123456789012';
describe('recuperación conectada mediante enlace', () => {
 let http: HttpTestingController;
 beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideRouter([
   { path: 'forgot-password', component: ConnectedForgotPasswordPage },
   { path: 'reset-password', component: ConnectedForgotPasswordPage },
   { path: 'login', component: LoginDestinationComponent },
  ]), provideIonicAngular({ animated: false }), provideHttpClient(), provideHttpClientTesting(),
  { provide: API_BASE_URL, useValue: base }, { provide: BACKEND_SESSION_ENABLED, useValue: true }] });
  http = TestBed.inject(HttpTestingController);
 });
 afterEach(() => { http.verify(); vi.restoreAllMocks(); vi.useRealTimers(); });
 it('abre el formulario, retira el token de la URL y consume solo al confirmar explícitamente', async () => {
  const h = await RouterTestingHarness.create();
  const p = await h.navigateByUrl(`/reset-password?token=${token}`, ConnectedForgotPasswordPage);
  h.detectChanges();
  expect(p['step']()).toBe('confirm');
  expect(TestBed.inject(Location).path()).toBe('/reset-password');
  expect(h.routeNativeElement?.querySelector('input[name="token"]')).toBeNull();
  http.expectNone(r => r.method === 'POST');
  p['confirmForm'].patchValue({ password: 'Synthetic@9zSafe', confirmPassword: 'Synthetic@9zSafe' });
  p['confirm'](); p['confirm']();
  const request = http.expectOne(`${base}/api/auth/password-reset/confirm`);
  expect(request.request.body).toEqual({ token, newPassword: 'Synthetic@9zSafe' });
  request.flush({ success: true });
  expect(p['step']()).toBe('done');
  expect(p['confirmForm'].getRawValue()).toEqual({ token: '', password: '', confirmPassword: '' });
 });
 it('espera un reenvío explícito y no ofrece captura manual ni duplica solicitudes', async () => {
  const h = await RouterTestingHarness.create();
  const p = await h.navigateByUrl('/forgot-password', ConnectedForgotPasswordPage);
  h.detectChanges();
  expect(h.routeNativeElement?.textContent).not.toContain('Ya tengo un enlace o código');
  p['requestForm'].setValue({ email: 'synthetic@gmail.com' }); p['request'](); p['request']();
  http.expectOne(`${base}/api/auth/password-reset/request`).flush({ success: true });
  expect(p['step']()).toBe('sent'); expect(p['resendSeconds']()).toBe(60);
  p['request'](); http.expectNone(r => r.method === 'POST'); p.ionViewWillLeave();
 });
 it('rechaza parámetros duplicados y limpia contraseñas ante error sin perder la opción de reintento', async () => {
  const h = await RouterTestingHarness.create();
  let p = await h.navigateByUrl(`/reset-password?token=${token}&token=${token}`, ConnectedForgotPasswordPage);
  expect(p['step']()).toBe('request'); expect(p['errorMessage']()).toContain('no es válido');
  p = await h.navigateByUrl(`/reset-password?token=${token}`, ConnectedForgotPasswordPage);
  p['confirmForm'].patchValue({ password: 'Synthetic@9zSafe', confirmPassword: 'Synthetic@9zSafe' });
  p['confirm'](); http.expectOne(`${base}/api/auth/password-reset/confirm`).error(new ProgressEvent('error'));
  expect(p['confirmForm'].controls.password.value).toBe('');
  expect(p['confirmForm'].controls.token.value).toBe(token);
  p.ionViewWillLeave(); expect(p['confirmForm'].controls.token.value).toBe('');
 });
 it('muestra una única confirmación contextual y navega una vez tras seis segundos confirmados',async()=>{
  const h=await RouterTestingHarness.create();
  const p=await h.navigateByUrl(`/reset-password?token=${token}`,ConnectedForgotPasswordPage);
  const navigation=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  vi.useFakeTimers({toFake:['setInterval','clearInterval','Date']});
  p['confirmForm'].patchValue({password:'Synthetic@9zSafe',confirmPassword:'Synthetic@9zSafe'});p['confirm']();
  await vi.advanceTimersByTimeAsync(12000);expect(navigation).not.toHaveBeenCalled();
  const intervals=vi.spyOn(globalThis,'setInterval');const cancellations=vi.spyOn(globalThis,'clearInterval');
  http.expectOne(`${base}/api/auth/password-reset/confirm`).flush({success:true});
  const successTimer=intervals.mock.results[0].value;h.detectChanges();
  expect(h.routeNativeElement?.querySelectorAll('.auth-card')).toHaveLength(1);
  expect(h.routeNativeElement?.querySelector('.recovery-hero-card')).toBeNull();
  expect(h.routeNativeElement?.querySelector('.success-message')).toBeNull();
  expect(h.routeNativeElement?.querySelector('ion-icon[name="checkmark-outline"]')).toBeTruthy();
  expect(h.routeNativeElement?.textContent).toContain('Tu contraseña se cambió correctamente.');
  expect(p['redirectSeconds']()).toBe(6);
  await vi.advanceTimersByTimeAsync(1000);expect(p['redirectSeconds']()).toBe(5);
  await vi.advanceTimersByTimeAsync(5000);
  expect(navigation).toHaveBeenCalledExactlyOnceWith(['/login'],{replaceUrl:true});
  expect(cancellations).toHaveBeenCalledWith(successTimer);
  await vi.advanceTimersByTimeAsync(10000);expect(navigation).toHaveBeenCalledOnce();
 });
 it('el regreso manual cancela el contador y evita la navegación duplicada',async()=>{
  const h=await RouterTestingHarness.create();const p=await h.navigateByUrl(`/reset-password?token=${token}`,ConnectedForgotPasswordPage);
  const navigation=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  vi.useFakeTimers({toFake:['setInterval','clearInterval','Date']});
  p['confirmForm'].patchValue({password:'Synthetic@9zSafe',confirmPassword:'Synthetic@9zSafe'});p['confirm']();
  http.expectOne(`${base}/api/auth/password-reset/confirm`).flush({success:true});
  p['goBackToLogin']();p['goBackToLogin']();await vi.advanceTimersByTimeAsync(10000);
  expect(navigation).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
 });
 it.each(['leave','destroy'])('limpia el temporizador y los secretos al abandonar: %s',async mode=>{
  const h=await RouterTestingHarness.create();const p=await h.navigateByUrl(`/reset-password?token=${token}`,ConnectedForgotPasswordPage);
  const navigation=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  vi.useFakeTimers({toFake:['setInterval','clearInterval','Date']});
  p['confirmForm'].patchValue({password:'Synthetic@9zSafe',confirmPassword:'Synthetic@9zSafe'});p['confirm']();
  http.expectOne(`${base}/api/auth/password-reset/confirm`).flush({success:true});
  if(mode==='leave')p.ionViewWillLeave();else TestBed.resetTestingModule();
  await vi.advanceTimersByTimeAsync(10000);
  expect(navigation).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
  expect(p['confirmForm'].controls.token.value).toBe('');
 });
 it('un error no reutiliza éxito ni programa una redirección',async()=>{
  const h=await RouterTestingHarness.create();const p=await h.navigateByUrl(`/reset-password?token=${token}`,ConnectedForgotPasswordPage);
  const navigation=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  vi.useFakeTimers({toFake:['setInterval','clearInterval','Date']});
  p['confirmForm'].patchValue({password:'Synthetic@9zSafe',confirmPassword:'Synthetic@9zSafe'});p['confirm']();
  http.expectOne(`${base}/api/auth/password-reset/confirm`).error(new ProgressEvent('error'));
  await vi.advanceTimersByTimeAsync(10000);
  expect(p['step']()).toBe('confirm');expect(navigation).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 });

});
