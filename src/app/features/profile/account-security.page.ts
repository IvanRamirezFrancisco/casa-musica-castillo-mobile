import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent } from '@ionic/angular';
import { Observable, Subject, catchError, forkJoin, of, takeUntil } from 'rxjs';
import { HttpAccountSecurityRepository, SecurityMethods, TotpEnrollment } from '../../core/infrastructure/http-account-security.repository';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { AuthService } from '../../core/services/auth.service';
import { describeApiError } from '../../core/api/api-error-message';
import {
 FIELD_LIMITS, FIELD_MESSAGES, passwordByteLength, passwordCharacterTypes, passwordValidator, passwordsMatch,
} from '../../core/validation/auth-fields.validation';
import { CmcInputComponent } from '../../shared/ui/input/cmc-input.component';
@Component({
 selector: 'app-account-security', standalone: true,
 imports: [FormsModule, ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, CmcButtonComponent, CmcIconComponent, CmcInputComponent],
 templateUrl: './account-security.page.html',
 styleUrl: './account-security.page.scss',
})
export class AccountSecurityPage {
 private readonly repo=inject(HttpAccountSecurityRepository); private readonly destroyRef=inject(DestroyRef);
 private readonly auth=inject(AuthService);
 private readonly router=inject(Router);
 readonly methods=signal<SecurityMethods|null>(null); readonly enrollment=signal<TotpEnrollment|null>(null);
 readonly codes=signal<string[]>([]); readonly busy=signal(false); readonly error=signal(''); readonly notice=signal('');
 private readonly cancelled=new Subject<void>();
 private cached = false;
 readonly disabling=signal(false); readonly generating=signal(false); code='';
 readonly backupCount=signal<number|null>(null);
 readonly passwordChangeAvailable=signal(false);
 readonly passwordFocused=signal(false);
 readonly limits=FIELD_LIMITS;
 readonly ringRadius=46;
 readonly ringCircumference=289.03;
 readonly passwordForm=inject(NonNullableFormBuilder).group({
  currentPassword: ['', [Validators.required, Validators.maxLength(255)]],
  password: ['', [passwordValidator]],
  confirmPassword: ['', [Validators.required]],
 }, {validators: passwordsMatch});
 constructor() {
  this.auth.sessionEnded$.pipe(takeUntilDestroyed()).subscribe(()=>{
   this.clearSecrets();this.methods.set(null);this.backupCount.set(null);this.passwordChangeAvailable.set(false);
  });
  this.destroyRef.onDestroy(()=>this.clearSecrets()); this.reload();
 }
 ionViewWillLeave():void {this.cached=true;this.clearSecrets();}
 ionViewDidLeave():void {this.clearSecrets();}
 ionViewWillEnter():void {if(this.cached){this.cached=false;this.reload();}}
 clearSecrets():void {this.cancelled.next();this.busy.set(false);this.enrollment.set(null);this.codes.set([]);this.code='';this.generating.set(false);this.disabling.set(false);this.passwordForm.reset();}
 validCode():boolean {return /^\d{6}$/.test(this.code);}
 activeControlsCount(m: SecurityMethods): number {
  return [m.EMAIL, m.GOOGLE_AUTHENTICATOR, m.BACKUP_CODES].filter(Boolean).length;
 }
 ringStrokeDashoffset(m: SecurityMethods): number {
  const completed = this.activeControlsCount(m);
  return Number((this.ringCircumference * (1 - completed / 3)).toFixed(2));
 }
 passwordChecklist() {
  const value = this.passwordForm.controls.password.value;
  const length = value.length >= FIELD_LIMITS.passwordMin && value.length <= FIELD_LIMITS.passwordMax;
  const tooLong = value.length > FIELD_LIMITS.passwordMax || passwordByteLength(value) > FIELD_LIMITS.passwordMaxBytes;
  const variety = passwordCharacterTypes(value) === 4;
  const valid = this.passwordForm.controls.password.valid;
  const feedback: 'negative' | 'warning' | 'positive' = valid ? 'positive' : !tooLong && (length || variety) ? 'warning' : 'negative';
  const strength = valid ? 'Fuerte' : feedback === 'warning' ? 'Media' : 'Débil';
  const level = valid ? 3 : feedback === 'warning' ? 2 : value ? 1 : 0;
  return { length, variety, tooLong, feedback, strength, level } as const;
 }
 passwordsCoincide(): boolean {
  return !!this.passwordForm.controls.confirmPassword.value && !this.passwordForm.hasError('passwordMismatch');
 }
 reload():void {
  this.run(forkJoin({
   methods: this.repo.methods(),
   passwordChange: this.repo.passwordChangeRevokesSessions().pipe(catchError(() => of(false))),
   backupCount: this.repo.availableBackupCodes().pipe(catchError(() => of(null))),
  }), ({methods, passwordChange, backupCount}) => {
   this.methods.set(methods);
   this.passwordChangeAvailable.set(passwordChange);
   this.backupCount.set(backupCount);
  });
 }
 setup():void {if(this.busy())return;this.clearSecrets();this.run(this.repo.setup(),e=>this.enrollment.set(e));}
 confirm():void {if(!this.validCode())return;this.run(this.repo.confirm(this.code),()=>{this.clearSecrets();this.notice.set('Autenticador confirmado por el servidor.');this.reload();});}
 changeEmail(enabled:boolean):void {this.run(this.repo.email(enabled),()=>{this.notice.set('Método actualizado por el servidor.');this.reload();});}
 requestDisable():void {this.disabling.set(true);}
 disable():void {this.run(this.repo.disableTotp(),()=>{this.clearSecrets();this.reload();});}
 generate():void {this.codes.set([]);this.run(this.repo.generate(),codes=>{this.generating.set(false);this.codes.set(codes);this.backupCount.set(codes.length);});}
 passwordError(field: 'currentPassword' | 'password' | 'confirmPassword'): string {
  const control = this.passwordForm.controls[field];
  if (!control.touched) return '';
  if (field === 'confirmPassword' && control.valid && this.passwordForm.hasError('passwordMismatch')) return 'Las contraseñas no coinciden.';
  const key = Object.keys(control.errors ?? {})[0];
  return key ? FIELD_MESSAGES[key] ?? 'Revisa la contraseña.' : '';
 }
 changePassword():void {
  if (!this.passwordChangeAvailable() || this.busy()) return;
  if (this.passwordForm.invalid) {this.passwordForm.markAllAsTouched();return;}
  const {currentPassword, password} = this.passwordForm.getRawValue();
  this.run(this.repo.changePassword(currentPassword, password), () => {
   this.passwordForm.reset();
   this.notice.set('Contraseña actualizada. Inicia sesión con la nueva contraseña.');
   void this.auth.clearAfterPasswordChange().finally(() => {
    if (this.router.url === '/profile/security') {
     void this.router.navigate(['/login'], {replaceUrl: true, state: {passwordChanged: true}});
    }
   });
  }, 'form');
 }
 async copyKey():Promise<void> {const key=this.enrollment()?.manualEntryKey;if(!key)return;try{await navigator.clipboard.writeText(key);this.notice.set('Clave copiada. El portapapeles puede conservarla: bórrala después de configurarlo.');}catch{this.notice.set('No se pudo copiar. Introduce la clave manualmente.');}}
 private run<T>(request:Observable<T>,success:(data:T)=>void, context: 'generic' | 'form' = 'generic'):void {
  if(this.busy())return;this.busy.set(true);this.error.set('');
  request.pipe(takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef)).subscribe({
   next:data=>{this.busy.set(false);success(data);},
   error:error=>{this.busy.set(false);this.error.set(describeApiError(error, context));},
  });
 }
}
