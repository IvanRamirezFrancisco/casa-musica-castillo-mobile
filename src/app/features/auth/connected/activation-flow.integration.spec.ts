import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideIonicAngular } from '@ionic/angular';
import { API_BASE_URL } from '../../../core/api/api-base-url.token';
import { BACKEND_SESSION_ENABLED } from '../../../core/config/backend-session.token';
import { authInterceptor } from '../../../core/security/auth.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { ConnectedRegisterPage } from './connected-register.page';
import { VerifyEmailPage } from './verify-email.page';

const base='https://api.example.test';
const email='activation@gmail.com';
const registration={username:'activation_user',firstName:'Cuenta',lastName:'Sintética',email,phone:'',password:'Cl4ve-Segura',confirmPassword:'Cl4ve-Segura'};

describe('activación unificada: registro, código y enlace',()=>{
 let http:HttpTestingController;
 beforeEach(()=>{
  TestBed.configureTestingModule({providers:[provideRouter([
   {path:'verify-account',component:VerifyEmailPage},{path:'verify-email',component:VerifyEmailPage},
  ]),provideIonicAngular({animated:false}),provideHttpClient(withInterceptors([authInterceptor])),provideHttpClientTesting(),
   {provide:API_BASE_URL,useValue:base},{provide:BACKEND_SESSION_ENABLED,useValue:true}]});
  http=TestBed.inject(HttpTestingController);
 });
 afterEach(()=>{http.verify();vi.useRealTimers();});
 function page(){const f=TestBed.createComponent(VerifyEmailPage);f.detectChanges();return f;}
 function register(){
  const f=TestBed.createComponent(ConnectedRegisterPage);f.detectChanges();
  http.expectOne(`${base}/api/public/legal/registration`).flush({required:false});
  f.componentInstance['form'].setValue(registration);f.componentInstance['submit']();return f;
 }
 it('integra el mismo OTP después del registro sin reenviar, ni crear otro scroll o sesión',()=>{
  const f=register();http.expectOne(`${base}/api/auth/register`).flush({success:true});f.detectChanges();
  const view=f.debugElement.query(By.directive(VerifyEmailPage)).componentInstance as VerifyEmailPage;
  expect(f.nativeElement.querySelectorAll('ion-content')).toHaveLength(1);
  expect(f.nativeElement.querySelectorAll('cmc-otp-input')).toHaveLength(1);
  expect(view['codeEntry']()).toBe(true);
  expect(f.nativeElement.textContent).toContain('a•••@gmail.com');
  http.expectNone(`${base}/api/auth/resend-verification`);
  view['updateDigits']('001234');http.expectNone(`${base}/api/auth/verify-email-code`);
  view['verifyCode']();view['verifyCode']();
  const req=http.expectOne(`${base}/api/auth/verify-email-code`);
  expect(req.request.body).toEqual({email,code:'001234'});
  expect(req.request.headers.has('Authorization')).toBe(false);
  expect(view['verified']()).toBe(false);
  req.flush({success:true});f.detectChanges();
  expect(f.nativeElement.textContent).toContain('Cuenta verificada');
  expect(f.nativeElement.querySelector('cmc-otp-input')).toBeNull();
  expect(TestBed.inject(AuthService).user()).toBeNull();f.destroy();
 });
 it('no muestra OTP al escribir un correo válido: requiere una entrada explícita',()=>{
  const f=page(),v=f.componentInstance;v['resendForm'].setValue({email});f.detectChanges();
  expect(f.nativeElement.querySelector('cmc-otp-input')).toBeNull();
  http.expectNone(request=>request.method==='POST');
  v['enterCode']();f.detectChanges();expect(f.nativeElement.querySelector('cmc-otp-input')).toBeTruthy();
  http.expectNone(request=>request.method==='POST');f.destroy();
 });
 it('vuelve al inicio del mismo ion-content cuando cambia de registro a activación',()=>{
  const f=register();
  const scrollToTop=vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(f.nativeElement.querySelector('ion-content'),'scrollToTop',{value:scrollToTop,configurable:true});
  http.expectOne(`${base}/api/auth/register`).flush({success:true});f.detectChanges();
  expect(scrollToTop).toHaveBeenCalledExactlyOnceWith(0);
  http.expectNone(`${base}/api/auth/resend-verification`);f.destroy();
 });
 it('pegar seis dígitos conserva ceros iniciales y solo verifica al confirmar',()=>{
  const f=page(),v=f.componentInstance;v['resendForm'].setValue({email});v['enterCode']();f.detectChanges();
  const input:HTMLInputElement=f.nativeElement.querySelector('#activation-code');
  input.value='001234';input.dispatchEvent(new Event('input',{bubbles:true}));f.detectChanges();
  expect(v['digits']()).toBe('001234');http.expectNone(`${base}/api/auth/verify-email-code`);
  v['verifyCode']();http.expectOne(`${base}/api/auth/verify-email-code`).flush({success:true});f.destroy();
 });
 it('mantiene el correo y permite el código recibido cuando no se confirmó el reenvío',()=>{
  const f=page(),v=f.componentInstance;v['resendForm'].setValue({email});v['resend']();
  http.expectOne(`${base}/api/auth/resend-verification`).error(new ProgressEvent('error'));f.detectChanges();
  expect(v['errorMessage']()).toContain('No pudimos confirmar la solicitud');
  expect(v['resendForm'].controls.email.value).toBe(email);expect(v['verified']()).toBe(false);
  v['enterCode']();v['updateDigits']('123456');v['verifyCode']();
  http.expectOne(`${base}/api/auth/verify-email-code`).flush({success:true});
  http.expectNone(`${base}/api/auth/resend-verification`);f.destroy();
 });
 it('asocia un rechazo de instrucciones al correo sin revelar un estado de cuenta del servidor',()=>{
  const f=page(),v=f.componentInstance;v['resendForm'].setValue({email});v['resend']();
  http.expectOne(`${base}/api/auth/resend-verification`).flush({message:'User not found'},{status:400,statusText:'Bad Request'});
  expect(v['errorMessage']()).toContain('Revisa el correo');
  expect(v['errorMessage']()).not.toContain('User not found');expect(v['codeInvalid']()).toBe(false);f.destroy();
 });
 it('una respuesta perdida de registro ofrece activación sin fingir aceptación ni reenviar',()=>{
  const f=register();http.expectOne(`${base}/api/auth/register`).error(new ProgressEvent('error'));f.detectChanges();
  expect(f.componentInstance['registered']()).toBe(false);
  expect(f.componentInstance['registrationUncertain']()).toBe(true);
  expect(f.componentInstance['form'].controls.password.value).toBe('');
  expect(f.nativeElement.querySelector('cmc-otp-input')).toBeTruthy();
  expect(f.nativeElement.textContent).toContain('No pudimos confirmar la solicitud');
  http.expectNone(`${base}/api/auth/resend-verification`);f.destroy();
 });
 it('una respuesta incompatible de registro permite recuperar instrucciones existentes sin afirmar éxito',()=>{
  const f=register();http.expectOne(`${base}/api/auth/register`).flush({unexpected:true});f.detectChanges();
  expect(f.componentInstance['registered']()).toBe(false);
  expect(f.componentInstance['registrationUncertain']()).toBe(true);
  expect(f.nativeElement.querySelector('cmc-otp-input')).toBeTruthy();
  http.expectNone(`${base}/api/auth/resend-verification`);f.destroy();
 });
 it('rechaza código incompleto y permite corregir errores sin un éxito local falso',()=>{
  const f=page(),v=f.componentInstance;v['resendForm'].setValue({email});v['enterCode']();
  for(const invalid of ['123','1234567','abcdef']){v['updateDigits'](invalid);v['verifyCode']();}
  http.expectNone(`${base}/api/auth/verify-email-code`);
  v['updateDigits']('123456');v['verifyCode']();
  http.expectOne(`${base}/api/auth/verify-email-code`).flush({message:'invalid'},{status:400,statusText:'Invalid'});
  f.detectChanges();expect(v['verified']()).toBe(false);expect(v['codeInvalid']()).toBe(true);
  expect(f.nativeElement.querySelectorAll('[role="alert"]')).toHaveLength(1);
  v['updateDigits']('654321');expect(v['codeInvalid']()).toBe(false);
  v['verifyCode']();http.expectOne(`${base}/api/auth/verify-email-code`).flush({success:true});f.destroy();
 });
 it('un error de red conserva el código para un reintento explícito, sin repetir solicitudes',()=>{
  const f=page(),v=f.componentInstance;v['resendForm'].setValue({email});v['enterCode']();v['updateDigits']('123456');v['verifyCode']();
  http.expectOne(`${base}/api/auth/verify-email-code`).error(new ProgressEvent('error'));
  expect(v['digits']()).toBe('123456');expect(v['retryCode']()).toBe(true);expect(v['codeInvalid']()).toBe(false);
  http.expectNone(`${base}/api/auth/verify-email-code`);
  v['verifyCode']();http.expectOne(`${base}/api/auth/verify-email-code`).flush({success:true});f.destroy();
 });
 it('no confirma activación con una respuesta incompatible y conserva el código para recuperación',()=>{
  const f=page(),v=f.componentInstance;v['resendForm'].setValue({email});v['enterCode']();v['updateDigits']('123456');v['verifyCode']();
  http.expectOne(`${base}/api/auth/verify-email-code`).flush({unexpected:true});
  expect(v['verified']()).toBe(false);expect(v['digits']()).toBe('123456');expect(v['retryCode']()).toBe(true);
  expect(TestBed.inject(AuthService).user()).toBeNull();
  http.expectNone(`${base}/api/auth/verify-email-code`);f.destroy();
 });
 it('utiliza Retry-After y mantiene independientes envío y verificación',()=>{
  const f=page(),v=f.componentInstance;v['resendForm'].setValue({email});v['resend']();
  http.expectOne(`${base}/api/auth/resend-verification`).flush({}, {status:429,statusText:'Limited',headers:{'Retry-After':'120'}});
  expect(v['resendSeconds']()).toBe(120);expect(v['verificationSeconds']()).toBe(0);
  v['enterCode']();v['updateDigits']('123456');v['verifyCode']();
  http.expectOne(`${base}/api/auth/verify-email-code`).flush({}, {status:429,statusText:'Limited',headers:{'Retry-After':'73'}});
  expect(v['resendSeconds']()).toBe(120);expect(v['verificationSeconds']()).toBe(73);
  v['verifyCode']();v['resend']();http.expectNone(request=>request.method==='POST');f.destroy();
 });
 it('el contador no se reinicia con su propio tick ni dispara correos al vencer',()=>{
  vi.useFakeTimers();const f=register();http.expectOne(`${base}/api/auth/register`).flush({success:true});f.detectChanges();
  const v=f.debugElement.query(By.directive(VerifyEmailPage)).componentInstance as VerifyEmailPage;
  expect(v['resendSeconds']()).toBe(30);vi.advanceTimersByTime(5000);f.detectChanges();expect(v['resendSeconds']()).toBe(25);
  vi.advanceTimersByTime(26000);f.detectChanges();expect(v['resendSeconds']()).toBe(0);
  http.expectNone(`${base}/api/auth/resend-verification`);f.destroy();
 });
 it('cancela una solicitud de otra dirección y limpia el texto provisional',()=>{
  const f=page(),v=f.componentInstance;v['resendForm'].setValue({email});v['resend']();
  const old=http.expectOne(`${base}/api/auth/resend-verification`);
  v['resendForm'].setValue({email:'different@gmail.com'});expect(old.cancelled).toBe(true);
  expect(v['notice']()).toBe('');expect(v['codeEntry']()).toBe(false);expect(v['digits']()).toBe('');f.destroy();
 });
 it('cancela registro si cambia el correo, y no asigna la respuesta vieja a la nueva dirección',()=>{
  const f=register();const old=http.expectOne(`${base}/api/auth/register`);
  f.componentInstance['form'].controls.email.setValue('different@gmail.com');
  expect(old.cancelled).toBe(true);expect(f.componentInstance['registered']()).toBe(false);f.destroy();
 });
 it('verifica un enlace con la misma implementación, retira el token visible y no autentica',async()=>{
  const harness=await RouterTestingHarness.create('/verify-account?token=synthetic-link-token');
  const req=http.expectOne(`${base}/api/auth/verify-email`);expect(req.request.body).toEqual({token:'synthetic-link-token'});
  expect(harness.routeNativeElement?.textContent).toContain('Verificando el enlace de activación');
  expect(TestBed.inject(Location).path()).not.toContain('token=');req.flush({success:true});harness.detectChanges();
  expect(harness.routeNativeElement?.textContent).toContain('Cuenta verificada');
  expect(TestBed.inject(AuthService).user()).toBeNull();
 });
 it('rechaza tokens duplicados en una URL sin consultar la API',async()=>{
  const harness=await RouterTestingHarness.create('/verify-account?token=one&token=two');harness.detectChanges();
  http.expectNone(`${base}/api/auth/verify-email`);
  expect(harness.routeNativeElement?.textContent).toContain('El enlace de activación no es válido');
  expect(TestBed.inject(Location).path()).not.toContain('token=');
 });
 it('cancela un enlace anterior si llega otro durante la verificación',async()=>{
  await RouterTestingHarness.create('/verify-account?token=first-synthetic-token');
  const first=http.expectOne(`${base}/api/auth/verify-email`);
  await TestBed.inject(Router).navigateByUrl('/verify-account?token=second-synthetic-token');
  expect(first.cancelled).toBe(true);
  const second=http.expectOne(`${base}/api/auth/verify-email`);
  expect(second.request.body).toEqual({token:'second-synthetic-token'});
  second.flush({success:true});
  http.expectNone(`${base}/api/auth/verify-email`);
 });
 it('limpia el enlace pendiente y el código al abandonar la vista',()=>{
  const f=page(),v=f.componentInstance;v['form'].setValue({token:'synthetic-token'});v['verify']();
  const req=http.expectOne(`${base}/api/auth/verify-email`);v.ionViewWillLeave();
  expect(req.cancelled).toBe(true);expect(v['form'].controls.token.value).toBe('');expect(v['digits']()).toBe('');f.destroy();
 });
});
