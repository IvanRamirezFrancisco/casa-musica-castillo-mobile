import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent } from '@ionic/angular';
import { Observable, Subject, takeUntil } from 'rxjs';
import { HttpAccountSecurityRepository, SecurityMethods, TotpEnrollment } from '../../core/infrastructure/http-account-security.repository';
import { AuthService } from '../../core/services/auth.service';
@Component({
 selector: 'app-account-security', standalone: true,
 imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
 styles: ['main {max-width:480px;margin:auto;padding:16px;} section {margin-block:24px;} button,input {min-height:48px;max-width:100%;padding:10px;border:1px solid var(--cmc-border);border-radius:8px;} button {background:#722F37;color:white;margin:4px;} input {width:100%;} img {display:block;width:240px;max-width:100%;} code {overflow-wrap:anywhere;} ul {user-select:text;}'],
 template: `<ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/main/profile" /></ion-buttons><ion-title>Seguridad de la cuenta</ion-title></ion-toolbar></ion-header>
 <ion-content class="cmc-page"><main class="cmc-account">
 <p>Configura los métodos que protegerán tu acceso después de la contraseña.</p>
 @if(busy()) {<p role="status">Procesando solicitud…</p>}
 @if(error()) {<p role="alert">{{error()}}</p><button [disabled]="busy()" (click)="reload()">Reintentar consulta</button>}
 @if(notice()) {<p role="status">{{notice()}}</p>}
 @if(methods(); as m) {
 <section><h2>Correo electrónico</h2><p>{{m.EMAIL ? 'Activado' : 'Desactivado'}}</p><button [disabled]="busy()" (click)="changeEmail(!m.EMAIL)">{{m.EMAIL ? 'Desactivar correo' : 'Activar correo'}}</button></section>
 <section><h2>Google Authenticator</h2><p>{{m.GOOGLE_AUTHENTICATOR ? 'Activado' : 'Desactivado'}}</p>
 @if(!m.GOOGLE_AUTHENTICATOR) {<button [disabled]="busy()" (click)="setup()">Configurar autenticador</button>}
 @else {<button [disabled]="busy()" (click)="requestDisable()">Desactivar autenticador</button>}
 @if(disabling()) {<p>Perderás este método de acceso. Confirma para enviar la solicitud al servidor.</p><button [disabled]="busy()" (click)="disable()">Confirmar desactivación</button><button (click)="disabling.set(false)">Cancelar</button>}
 @if(enrollment(); as e) {<p>Escanea este QR con tu aplicación autenticadora o introduce la clave manual. No compartas esta pantalla.</p>
 <img [src]="e.qrCode" alt="QR privado para configurar tu autenticador" referrerpolicy="no-referrer" />
 <p>Clave manual: <code>{{e.manualEntryKey}}</code></p><button (click)="copyKey()">Copiar clave</button>
 <label for="totp-confirm">Código temporal de 6 dígitos</label><input id="totp-confirm" inputmode="numeric" autocomplete="one-time-code" maxlength="6" [(ngModel)]="code" />
 <button [disabled]="busy() || !validCode()" (click)="confirm()">Confirmar activación</button><button (click)="clearSecrets()">Ocultar configuración</button>}
 </section>
 <section><h2>Códigos de recuperación</h2><p>{{m.BACKUP_CODES ? 'Método activo' : 'Sin códigos activos'}}</p><p>Se generan diez códigos de un solo uso. Regenerar invalida todos los anteriores. Necesitas el autenticador activado.</p>
 <button [disabled]="busy() || !m.GOOGLE_AUTHENTICATOR" (click)="generating.set(true)">Generar o regenerar</button>
 @if(generating()) {<p>¿Invalidar los códigos anteriores y generar diez nuevos?</p><button [disabled]="busy()" (click)="generate()">Confirmar generación</button><button (click)="generating.set(false)">Cancelar</button>}
 @if(codes().length) {<p>Guárdalos ahora en un lugar seguro, por ejemplo un gestor de contraseñas. No se guardan en esta aplicación.</p><ul>@for(item of codes(); track item) {<li><code>{{item}}</code></li>}</ul><button (click)="clearSecrets()">Ocultar códigos</button>}
 </section>}
 </main></ion-content>`,
})
export class AccountSecurityPage {
 private readonly repo=inject(HttpAccountSecurityRepository); private readonly destroyRef=inject(DestroyRef);
 readonly methods=signal<SecurityMethods|null>(null); readonly enrollment=signal<TotpEnrollment|null>(null);
 readonly codes=signal<string[]>([]); readonly busy=signal(false); readonly error=signal(''); readonly notice=signal('');
 private readonly cancelled=new Subject<void>();
 readonly disabling=signal(false); readonly generating=signal(false); code='';
 constructor() {
  inject(AuthService).sessionEnded$.pipe(takeUntilDestroyed()).subscribe(()=>{this.clearSecrets();this.methods.set(null);});
  this.destroyRef.onDestroy(()=>this.clearSecrets()); this.reload();
 }
 ionViewDidLeave():void {this.clearSecrets();}
 clearSecrets():void {this.cancelled.next();this.busy.set(false);this.enrollment.set(null);this.codes.set([]);this.code='';this.generating.set(false);this.disabling.set(false);}
 validCode():boolean {return /^\d{6}$/.test(this.code);}
 reload():void {this.run(this.repo.methods(),m=>this.methods.set(m));}
 setup():void {if(this.busy())return;this.clearSecrets();this.run(this.repo.setup(),e=>this.enrollment.set(e));}
 confirm():void {if(!this.validCode())return;this.run(this.repo.confirm(this.code),()=>{this.clearSecrets();this.notice.set('Autenticador confirmado por el servidor.');this.reload();});}
 changeEmail(enabled:boolean):void {this.run(this.repo.email(enabled),()=>{this.notice.set('Método actualizado por el servidor.');this.reload();});}
 requestDisable():void {this.disabling.set(true);}
 disable():void {this.run(this.repo.disableTotp(),()=>{this.clearSecrets();this.reload();});}
 generate():void {this.codes.set([]);this.run(this.repo.generate(),codes=>{this.generating.set(false);this.codes.set(codes);});}
 async copyKey():Promise<void> {const key=this.enrollment()?.manualEntryKey;if(!key)return;try{await navigator.clipboard.writeText(key);this.notice.set('Clave copiada. El portapapeles puede conservarla: bórrala después de configurarlo.');}catch{this.notice.set('No se pudo copiar. Introduce la clave manualmente.');}}
 private run<T>(request:Observable<T>,success:(data:T)=>void):void {
  if(this.busy())return;this.busy.set(true);this.error.set('');
  request.pipe(takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef)).subscribe({next:data=>{this.busy.set(false);success(data);},error:()=>{this.busy.set(false);this.error.set('No se pudo completar la operación. Revisa la sesión y vuelve a intentarlo.');}});
 }
}
