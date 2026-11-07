import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent } from '@ionic/angular';
import { Observable, Subject, takeUntil } from 'rxjs';
import { HttpAccountSecurityRepository, SecurityMethods, TotpEnrollment } from '../../core/infrastructure/http-account-security.repository';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { AuthService } from '../../core/services/auth.service';
@Component({
 selector: 'app-account-security', standalone: true,
 imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, CmcButtonComponent, CmcIconComponent],
 templateUrl: './account-security.page.html',
 styleUrl: './account-security.page.scss',
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
