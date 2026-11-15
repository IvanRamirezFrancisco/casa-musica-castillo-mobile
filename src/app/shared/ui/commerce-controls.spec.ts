import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { By } from '@angular/platform-browser';
import { CmcInputComponent } from './input/cmc-input.component';
import { CmcQuantityComponent } from './quantity/cmc-quantity.component';
import { CmcMoneyPipe } from './money/cmc-money.pipe';
import { PurchaseIntentService } from '../../core/services/purchase-intent.service';
import { AuthService } from '../../core/services/auth.service';

describe('Controles comerciales compartidos',()=>{
 it('ignora eventos de entrada sin un input nativo y no permite revelar un campo deshabilitado',()=>{
  const f=TestBed.createComponent(CmcInputComponent);f.componentRef.setInput('label','Contraseña');f.componentRef.setInput('type','password');f.componentRef.setInput('disabled',true);f.detectChanges();const change=vi.fn();f.componentInstance.registerOnChange(change);f.debugElement.query(By.css('input')).triggerEventHandler('input',new Event('input'));f.debugElement.query(By.css('button')).triggerEventHandler('click',new Event('click'));f.detectChanges();expect(change).not.toHaveBeenCalled();expect(f.nativeElement.querySelector('input').type).toBe('password');f.destroy();
 });
 it('muestra y oculta contraseña conservando valor, elemento y foco, sin emitir otro cambio',()=>{
  const f=TestBed.createComponent(CmcInputComponent);f.componentRef.setInput('label','Contraseña');f.componentRef.setInput('type','password');f.detectChanges();const input=f.nativeElement.querySelector('input') as HTMLInputElement;const change=vi.fn();f.componentInstance.registerOnChange(change);input.value='  Clave sin normalizar  ';input.dispatchEvent(new Event('input'));f.detectChanges();input.focus();const button=f.nativeElement.querySelector('button') as HTMLButtonElement;button.click();f.detectChanges();expect(f.nativeElement.querySelector('input')).toBe(input);expect(input.type).toBe('text');expect(input.value).toBe('  Clave sin normalizar  ');expect(document.activeElement).toBe(input);expect(button.getAttribute('aria-label')).toBe('Ocultar contraseña');expect(button.getAttribute('aria-pressed')).toBe('true');button.click();f.detectChanges();expect(input.type).toBe('password');expect(change).toHaveBeenCalledTimes(1);expect(button.type).toBe('button');f.destroy();
 });
 it('toggle deshabilitado no revela contraseña; campos de correo no muestran el control',()=>{
  const f=TestBed.createComponent(CmcInputComponent);f.componentRef.setInput('label','Contraseña');f.componentRef.setInput('type','password');f.componentRef.setInput('disabled',true);f.detectChanges();f.nativeElement.querySelector('button').click();f.detectChanges();expect(f.nativeElement.querySelector('input').type).toBe('password');f.componentRef.setInput('type','email');f.detectChanges();expect(f.nativeElement.querySelector('button')).toBeNull();expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();f.destroy();
 });
 it('cantidad respeta límites, estado deshabilitado y etiquetas táctiles accesibles',()=>{
  const f=TestBed.createComponent(CmcQuantityComponent);f.componentRef.setInput('max',2);f.detectChanges();const emit=vi.fn();f.componentInstance.quantityChange.subscribe(emit);const buttons=f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;expect(buttons[0].disabled).toBe(true);buttons[1].click();expect(emit).toHaveBeenLastCalledWith(2);f.componentRef.setInput('value',2);f.detectChanges();expect(buttons[1].disabled).toBe(true);buttons[0].click();expect(emit).toHaveBeenLastCalledWith(1);f.componentRef.setInput('disabled',true);f.detectChanges();buttons[0].click();f.componentInstance.change(1);expect(emit).toHaveBeenCalledTimes(2);expect(buttons[0].getAttribute('aria-label')).toContain('Disminuir');f.destroy();
 });
 it.each([-2,0.5,100,NaN])('cantidad rechaza un salto fuera de rango %s',delta=>{const f=TestBed.createComponent(CmcQuantityComponent);f.componentRef.setInput('max',5);const emit=vi.fn();f.componentInstance.quantityChange.subscribe(emit);f.componentInstance.change(delta);expect(emit).not.toHaveBeenCalled();f.destroy();});
 it.each([0,6500,6.5,1000000])('moneda MXN utiliza Intl y no modifica el importe %s',value=>expect(new CmcMoneyPipe().transform(value)).toBe(new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(value)));
});

describe('Intención de compra volátil',()=>{
 let ended:Subject<void>;
 beforeEach(()=>{ended=new Subject<void>();TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{sessionEnded$:ended.asObservable()}}]});});
 afterEach(()=>vi.restoreAllMocks());
 it('es de un solo consumo, conserva cantidades sin datos personales y no mezcla productos',()=>{const s=TestBed.inject(PurchaseIntentService);expect(s.take(313)).toBeNull();s.remember(313,3);expect(s.take(314)).toBeNull();expect(s.take(313)).toBe(3);expect(s.take(313)).toBeNull();});
 it('vence después de diez minutos y se elimina al terminar sesión',()=>{const clock=vi.spyOn(Date,'now').mockReturnValue(1000);const s=TestBed.inject(PurchaseIntentService);s.remember(313,2);clock.mockReturnValue(601001);expect(s.take(313)).toBeNull();s.remember(313,1);ended.next();expect(s.take(313)).toBeNull();});
 it.each([[0,1],[313,0],[313,101],[313,1.2],[NaN,1]])('no guarda selección inválida %s / %s',(id,quantity)=>{const s=TestBed.inject(PurchaseIntentService);s.remember(id,quantity);expect(s.take(id)).toBeNull();});
});
