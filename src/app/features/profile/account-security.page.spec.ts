import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionDialogComponent } from '../../shared/ui/action-dialog/action-dialog.component';
import { AccountSecurityPage } from './account-security.page';
import { HttpAccountSecurityRepository } from '../../core/infrastructure/http-account-security.repository';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/services/auth.service';
describe('Security enrollment lifecycle with synthetic data',()=>{
 const ended=new Subject<void>();
 const clearAfterPasswordChange=vi.fn(() => Promise.resolve());
 const methods={EMAIL:false,GOOGLE_AUTHENTICATOR:true,BACKUP_CODES:false};
 const enrollment={manualEntryKey:'ABCDEFGHIJKLMNOP',qrCode:'data:image/png;base64,AAAA'};
 const repo={methods:vi.fn(),setup:vi.fn(),confirm:vi.fn(),email:vi.fn(),disableTotp:vi.fn(),generate:vi.fn(),
   disableBackupCodes:vi.fn(),availableBackupCodes:vi.fn(() => of(0)),passwordChangeRevokesSessions:vi.fn(() => of(false)),changePassword:vi.fn()};
 beforeEach(()=>{TestBed.overrideComponent(ActionDialogComponent,{set:{template:`<button (click)="canDismiss().then(result => result && closed.emit())">Cerrar</button><ng-container [ngTemplateOutlet]="content()" />`}});vi.resetAllMocks();repo.methods.mockReturnValue(of(methods));repo.setup.mockReturnValue(of(enrollment));repo.confirm.mockReturnValue(of(undefined));repo.email.mockReturnValue(of(undefined));repo.disableTotp.mockReturnValue(of(undefined));repo.generate.mockReturnValue(of(['0000-0000']));repo.disableBackupCodes.mockReturnValue(of(undefined));TestBed.configureTestingModule({providers:[provideRouter([]),{provide:HttpAccountSecurityRepository,useValue:repo},{provide:AuthService,useValue:{sessionEnded$:ended,clearAfterPasswordChange}}]});});
 it('loads the protected security route',async()=>{const {routes}=await import('../../app.routes');const route=routes.find(r=>r.path==='profile/security');expect(route?.canActivate?.length).toBe(1);expect(await route?.loadComponent?.()).toBe(AccountSecurityPage);});
 it('mantiene la cabecera en el único contenido desplazable, antes del resumen y los controles',()=>{
  const f=TestBed.createComponent(AccountSecurityPage);f.detectChanges();
  const root:HTMLElement=f.nativeElement;
  expect(root.querySelectorAll('ion-content')).toHaveLength(1);
  expect(root.querySelector('ion-header')).toBeNull();
  expect(root.querySelector('ion-content')?.firstElementChild?.classList.contains('security-scroll-header')).toBe(true);
  expect(root.querySelector('.security-scroll-header ion-back-button')?.getAttribute('defaultHref')).toBe('/main/profile');
  expect(root.querySelectorAll('h1')).toHaveLength(1);f.destroy();
 });
 it('counts controls without treating recovery as a second factor and explains unavailable password changes',()=>{
  const f=TestBed.createComponent(AccountSecurityPage), p=f.componentInstance;
  for(const count of [1,2,3]) {
   p.methods.set({EMAIL:true,GOOGLE_AUTHENTICATOR:count>1,BACKUP_CODES:count>2});f.detectChanges();
   expect(f.nativeElement.querySelector('.security-ring-score').textContent).toContain(`${count}/3`);
  }
  p.methods.set({EMAIL:false,GOOGLE_AUTHENTICATOR:false,BACKUP_CODES:true});f.detectChanges();
  expect(f.nativeElement.querySelector('.security-level').textContent).not.toContain('Segundo factor activo');
  expect(f.nativeElement.textContent).toContain('no representa un porcentaje de protección');
  const section=f.nativeElement.querySelector('[aria-labelledby="security-password"]');
  expect(section.textContent).toContain('Esta función no está disponible en esta versión del servidor.');
  expect(section.querySelector('button').disabled).toBe(true);
  expect(repo.changePassword).not.toHaveBeenCalled();f.destroy();
 });
 it('renders a failed query as an error without fabricating inactive methods or exposing secrets',()=>{
  repo.methods.mockReturnValue(throwError(()=>new Error('offline')));
  const f=TestBed.createComponent(AccountSecurityPage);f.detectChanges();
  expect(f.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  expect(f.nativeElement.querySelector('.security-checks')).toBeNull();
  expect(f.nativeElement.querySelector('#security-totp')).toBeNull();
  expect(f.nativeElement.textContent).not.toContain(enrollment.manualEntryKey);
  expect(repo.setup).not.toHaveBeenCalled();expect(repo.generate).not.toHaveBeenCalled();f.destroy();
 });
 it('operates security controls through the rendered UI with step-up confirmation',async()=>{const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;
 const click=(label:string)=>{f.detectChanges();const b=Array.from(f.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];const found=b.find(x=>x.textContent?.trim()===label);expect(found).toBeTruthy();found?.click();f.detectChanges();};
 f.detectChanges();click('Activar correo');click('Confirmar activación');p.methods.set({...methods,EMAIL:true});click('Desactivar correo');p.stepUpPassword='Synthetic@8kM';click('Confirmar desactivación');click('Desactivar autenticador');click('Cerrar');await Promise.resolve();click('Desactivar autenticador');p.stepUpPassword='Synthetic@8kM';click('Confirmar desactivación');click('Generar o regenerar');click('Cerrar');await Promise.resolve();click('Generar o regenerar');p.stepUpPassword='Synthetic@8kM';click('Confirmar generación');click('Cerrar');await Promise.resolve();p.methods.set({...methods,GOOGLE_AUTHENTICATOR:false});click('Configurar autenticador');click('Copiar clave');const input=f.nativeElement.querySelector('input#totp-confirm') as HTMLInputElement;input.value='123456';input.dispatchEvent(new Event('input'));p.code='123456';click('Confirmar activación');p.methods.set({...methods,GOOGLE_AUTHENTICATOR:false});click('Configurar autenticador');p.clearSecrets();p.error.set('Error');click('Reintentar consulta');f.destroy();});
 it('resume solo las opciones de seguridad confirmadas y ajusta la recomendación', () => {
   const fixture = TestBed.createComponent(AccountSecurityPage);
   const page = fixture.componentInstance;
   const root = fixture.nativeElement as HTMLElement;
   const summary = () => root.querySelector('.security-summary')!;
   page.methods.set({ EMAIL: false, GOOGLE_AUTHENTICATOR: false, BACKUP_CODES: false });
   fixture.detectChanges();
   expect(summary().textContent).toContain('Configuración básica');
   expect(summary().querySelectorAll('.security-checks li')).toHaveLength(3);
   expect(summary().textContent).toContain('Configura una aplicación autenticadora');
   expect(summary().querySelectorAll('.security-checks .is-active')).toHaveLength(0);

   page.methods.set(methods);
   fixture.detectChanges();
   expect(summary().textContent).toContain('Segundo factor activo');
   expect(summary().textContent).toContain('Genera códigos de recuperación');
   expect(summary().querySelectorAll('.security-checks .is-active')).toHaveLength(1);

   page.methods.set({ ...methods, EMAIL: true, BACKUP_CODES: true });
   fixture.detectChanges();
   expect(summary().textContent).toContain('Segundo factor y recuperación');
   expect(summary().textContent).toContain('3/3');
   expect(summary().textContent).toContain('Guarda tus códigos');
   expect(summary().querySelectorAll('.security-checks .is-active')).toHaveLength(3);
   expect(summary().querySelector('svg.security-ring')).toBeTruthy();
   expect(summary().textContent).not.toContain('%');
   fixture.destroy();
 });
 it('computes progressive password strength and requirement checklist in the password change form', () => {
   repo.passwordChangeRevokesSessions.mockReturnValue(of(true));
   const fixture = TestBed.createComponent(AccountSecurityPage);
   const page = fixture.componentInstance;
   fixture.detectChanges();
   expect(page.passwordChecklist().feedback).toBe('negative');
   expect(page.passwordChecklist().strength).toBe('Débil');
   page.passwordForm.controls.password.setValue('abcdefgh');
   expect(page.passwordChecklist().feedback).toBe('warning');
   expect(page.passwordChecklist().strength).toBe('Media');
   page.passwordForm.controls.password.setValue('Synthetic@9zN');
   expect(page.passwordChecklist().feedback).toBe('positive');
   expect(page.passwordChecklist().strength).toBe('Fuerte');
   page.passwordForm.controls.confirmPassword.setValue('Synthetic@9zN');
   expect(page.passwordsCoincide()).toBe(true);
   fixture.destroy();
 });
 it('renders methods, enrollment, confirmation and recovery controls accessibly',async()=>{const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;f.detectChanges();expect(f.nativeElement.textContent).toContain('Seguridad de la cuenta');p.methods.set({...methods,GOOGLE_AUTHENTICATOR:false});f.detectChanges();p.setup();f.detectChanges();expect(f.nativeElement.querySelector('img').src).toContain('data:image/png');expect(f.nativeElement.querySelector('input#totp-confirm').inputMode).toBe('numeric');p.disabling.set(true);p.generating.set(true);p.codes.set(['0000-0000']);p.notice.set('Guardado');p.error.set('Error de prueba');f.detectChanges();expect(f.nativeElement.textContent).toContain('0000-0000');p.busy.set(true);f.detectChanges();expect(f.nativeElement.textContent).toContain('Procesando');p.clearSecrets();p.methods.set({...methods,EMAIL:true,BACKUP_CODES:true});f.detectChanges();await p.copyKey();p.setup();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn().mockRejectedValue(new Error())}});await p.copyKey();expect(p.notice()).toContain('manualmente');Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn().mockResolvedValue(undefined)}});await p.copyKey();expect(p.notice()).toContain('copiada');f.destroy();});
 it('only activates after server confirmation and clears enrollment',()=>{const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;p.setup();expect(p.enrollment()).toEqual(enrollment);p.code='bad';p.confirm();expect(repo.confirm).not.toHaveBeenCalled();p.code='123456';p.confirm();expect(repo.confirm).toHaveBeenCalledWith('123456');expect(p.enrollment()).toBeNull();expect(p.notice()).toContain('confirmado');f.destroy();});
 it('displays errors without activating and retries',()=>{repo.confirm.mockReturnValue(throwError(()=>new Error('private')));const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;p.setup();p.code='000000';p.confirm();expect(p.error()).not.toContain('private');expect(p.enrollment()).not.toBeNull();p.reload();expect(p.busy()).toBe(false);f.destroy();});
 it('cancels pending secret responses on logout and view leave',()=>{const pending=new Subject<typeof enrollment>();repo.setup.mockReturnValue(pending);const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;p.setup();expect(p.busy()).toBe(true);p.setup();ended.next();pending.next(enrollment);expect(p.enrollment()).toBeNull();expect(p.methods()).toBeNull();p.ionViewDidLeave();f.destroy();});
 it('generates, replaces and hides backup codes with step-up password; clears on destruction',()=>{const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;p.generate();expect(repo.generate).not.toHaveBeenCalled();p.stepUpPassword='Synthetic@8kM';p.generate();expect(repo.generate).toHaveBeenCalledWith('Synthetic@8kM');expect(p.stepUpPassword).toBe('');expect(p.codes()).toHaveLength(1);repo.generate.mockReturnValue(of(['0000-0001']));p.stepUpPassword='Synthetic@8kM';p.generate();expect(p.codes()).toEqual(['0000-0001']);p.ionViewDidLeave();expect(p.codes()).toEqual([]);p.stepUpPassword='Synthetic@8kM';p.generate();f.destroy();expect(p.codes()).toEqual([]);});
 it('requires step-up password for disabling email, TOTP, and backup codes',()=>{const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;p.changeEmail(true);expect(repo.email).toHaveBeenCalledWith(true);p.changeEmail(false);expect(p.disablingEmail()).toBe(true);p.confirmDisableEmail();expect(repo.email).toHaveBeenCalledTimes(1);p.stepUpPassword='   ';p.confirmDisableEmail();expect(repo.email).toHaveBeenCalledTimes(1);p.stepUpPassword='Synthetic@8kM';p.confirmDisableEmail();expect(repo.email).toHaveBeenCalledWith(false,'Synthetic@8kM');expect(p.disablingEmail()).toBe(false);expect(p.stepUpPassword).toBe('');p.requestDisable();expect(p.disabling()).toBe(true);p.disable();expect(repo.disableTotp).not.toHaveBeenCalled();p.stepUpPassword='Synthetic@8kM';p.disable();expect(repo.disableTotp).toHaveBeenCalledWith('Synthetic@8kM');expect(p.disabling()).toBe(false);p.disablingBackup.set(true);p.disableBackup();expect(repo.disableBackupCodes).not.toHaveBeenCalled();p.stepUpPassword='Synthetic@8kM';p.disableBackup();expect(repo.disableBackupCodes).toHaveBeenCalledWith('Synthetic@8kM');expect(p.disablingBackup()).toBe(false);f.destroy();});
 it('distingue consulta pendiente, error, contrato no soportado y capacidad confirmada',()=>{
  const pending=new Subject<boolean>();repo.passwordChangeRevokesSessions.mockReturnValue(pending);
  const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;f.detectChanges();
  expect(p.passwordCapability()).toBe('loading');expect(p.passwordChangeAvailable()).toBe(false);
  pending.error(new Error('synthetic unavailable'));f.detectChanges();
  expect(p.passwordCapability()).toBe('error');expect(p.passwordChangeAvailable()).toBe(false);
  expect(f.nativeElement.textContent).toContain('Reintentar');
  repo.passwordChangeRevokesSessions.mockReturnValue(of(false));p.reload();
  expect(p.passwordCapability()).toBe('unsupported');expect(p.passwordChangeAvailable()).toBe(false);
  repo.passwordChangeRevokesSessions.mockReturnValue(of(true));p.reload();
  expect(p.passwordCapability()).toBe('available');expect(p.passwordChangeAvailable()).toBe(true);f.destroy();
 });
 it('una sesión vencida no se presenta como falta de soporte y cancela respuestas antiguas',()=>{
  repo.passwordChangeRevokesSessions.mockReturnValue(throwError(()=>new ApiError('http',401)));
  const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;
  expect(p.passwordCapability()).toBe('session-expired');expect(p.passwordChangeAvailable()).toBe(false);
  ended.next();expect(p.passwordCapability()).toBe('session-expired');f.destroy();
 });
 it('distingue un contrato incompatible de un fallo temporal y nunca habilita la operación sin garantía',()=>{
  repo.passwordChangeRevokesSessions.mockReturnValue(throwError(()=>new ApiError('invalid-response',200)));
  const f=TestBed.createComponent(AccountSecurityPage);const p=f.componentInstance;f.detectChanges();
  expect(p.passwordCapability()).toBe('incompatible');expect(p.passwordChangeAvailable()).toBe(false);
  const card=f.nativeElement.querySelector('[aria-labelledby="security-password"]');
  expect(card.textContent).toContain('Contrato incompatible');
  expect(card.textContent).not.toContain('No pudimos consultar esta función.');
  const buttons=Array.from(card.querySelectorAll('button')) as HTMLButtonElement[];
  expect(buttons.find(button=>button.textContent?.trim()==='Cambiar contraseña')?.disabled).toBe(true);
  repo.passwordChangeRevokesSessions.mockReturnValue(of(true));
  buttons.find(button=>button.textContent?.trim()==='Reintentar')?.click();f.detectChanges();
  expect(p.passwordCapability()).toBe('available');expect(p.passwordChangeAvailable()).toBe(true);f.destroy();
 });
 it('never duplicates an active request'  ,()=>{repo.methods.mockReturnValue(new Subject());const f=TestBed.createComponent(AccountSecurityPage);f.componentInstance.reload();expect(repo.methods).toHaveBeenCalledTimes(1);expect(f.componentInstance.busy()).toBe(true);f.destroy();});
 it('only submits a valid password change against the revoking contract and clears all fields', () => {
   const fixture = TestBed.createComponent(AccountSecurityPage);
   const page = fixture.componentInstance;
   page.changePassword();
   expect(repo.changePassword).not.toHaveBeenCalled();
   repo.passwordChangeRevokesSessions.mockReturnValue(of(true));
   page.reload();
   page.passwordForm.setValue({currentPassword: 'Synthetic@8kM', password: 'Synthetic@9zN', confirmPassword: 'different'});
   page.changePassword();
   expect(repo.changePassword).not.toHaveBeenCalled();
   repo.changePassword.mockReturnValue(of(undefined));
   page.passwordForm.controls.confirmPassword.setValue('Synthetic@9zN');
   page.changePassword();
   expect(repo.changePassword).toHaveBeenCalledWith('Synthetic@8kM', 'Synthetic@9zN');
   expect(clearAfterPasswordChange).toHaveBeenCalledOnce();
   expect(page.passwordForm.getRawValue()).toEqual({currentPassword: '', password: '', confirmPassword: ''});
 });
});
