import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { HttpAccountSecurityRepository } from './http-account-security.repository';
import { API_BASE_URL } from '../api/api-base-url.token';
describe('Account security HTTP contracts (synthetic responses only)',()=>{
 let repo:HttpAccountSecurityRepository;let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:API_BASE_URL,useValue:'http://localhost:8080'}]});repo=TestBed.inject(HttpAccountSecurityRepository);http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 it('lists only the session fields used by the app and revokes a selected session', () => {
   repo.sessions().subscribe(sessions => expect(sessions).toEqual([
     { id: 'session-a', device: 'Móvil', current: true },
     { id: 'session-b', device: 'Escritorio', current: false },
   ]));
   http.expectOne({ method: 'GET', url: 'http://localhost:8080/api/auth/sessions' }).flush({
     success: true, data: { sessions: [
       { id: 'session-a', deviceInfo: 'Móvil', isCurrent: true, ipAddress: '192.0.2.1' },
       { id: 'session-b', deviceInfo: 'Escritorio', isCurrent: false },
     ] },
   });
   repo.revokeSession('session-b').subscribe();
   http.expectOne({ method: 'DELETE', url: 'http://localhost:8080/api/auth/sessions/session-b' })
     .flush({ message: 'Sesión cerrada exitosamente' });
 });
 it('reads methods and rejects invalid envelopes',()=>{repo.methods().subscribe(m=>expect(m.EMAIL).toBe(true));http.expectOne('http://localhost:8080/api/2fa/methods').flush({success:true,data:{EMAIL:true,GOOGLE_AUTHENTICATOR:false,BACKUP_CODES:false}});repo.methods().subscribe({error:e=>expect(e.kind).toBe('invalid-response')});http.expectOne('http://localhost:8080/api/2fa/methods').flush({success:true,data:{}});});
 it('uses server QR only and rejects external QR URLs',()=>{repo.setup().subscribe(e=>expect(e.qrCode).toContain('data:image/png'));http.expectOne('http://localhost:8080/api/2fa/google/setup').flush({success:true,data:{manualEntryKey:'ABCDEFGHIJKLMNOP',qrCode:'data:image/png;base64,AAAA'}});repo.setup().subscribe({error:e=>expect(e.kind).toBe('invalid-response')});http.expectOne('http://localhost:8080/api/2fa/google/setup').flush({success:true,data:{manualEntryKey:'ABCDEFGHIJKLMNOP',qrCode:'https://external.test/qr'}});});
 it('confirms and changes methods using real authenticated POST routes with mandatory step-up password',()=>{
 repo.confirm('123456').subscribe();const req=http.expectOne('http://localhost:8080/api/2fa/google/confirm');expect(req.request.body).toEqual({code:'123456'});req.flush({success:true});
 repo.email(true).subscribe();http.expectOne('http://localhost:8080/api/2fa/email/enable').flush({success:true});
 repo.email(false,'Synthetic@8kM').subscribe();const emailDisable=http.expectOne('http://localhost:8080/api/2fa/email/disable');expect(emailDisable.request.body).toEqual({currentPassword:'Synthetic@8kM'});emailDisable.flush({success:true});
 repo.disableTotp('Synthetic@8kM').subscribe();const totpDisable=http.expectOne('http://localhost:8080/api/2fa/google/disable');expect(totpDisable.request.body).toEqual({currentPassword:'Synthetic@8kM'});totpDisable.flush({success:true});
 repo.disableBackupCodes('Synthetic@8kM').subscribe();const backupDisable=http.expectOne('http://localhost:8080/api/2fa/backup-codes/disable');expect(backupDisable.request.body).toEqual({currentPassword:'Synthetic@8kM'});backupDisable.flush({success:true});
 });
 it('validates ten distinct synthetic codes with step-up password and rejects duplicates',()=>{const codes=Array.from({length:10},(_,i)=>`0000-000${i}`);repo.generate('Synthetic@8kM').subscribe(c=>expect(c).toHaveLength(10));const genReq=http.expectOne('http://localhost:8080/api/2fa/backup-codes/generate');expect(genReq.request.body).toEqual({currentPassword:'Synthetic@8kM'});genReq.flush({success:true,data:{codes,count:10}});repo.generate('Synthetic@8kM').subscribe({error:e=>expect(e.kind).toBe('invalid-response')});http.expectOne('http://localhost:8080/api/2fa/backup-codes/generate').flush({success:true,data:{codes:Array(10).fill('0000-0000'),count:10}});});
 it.each([400,401,403,429])('propagates rejection %s without local activation',status=>{repo.confirm('000000').subscribe({error:e=>expect(e.status).toBe(status)});http.expectOne('http://localhost:8080/api/2fa/google/confirm').flush({success:false},{status,statusText:'Rejected'});});
});
