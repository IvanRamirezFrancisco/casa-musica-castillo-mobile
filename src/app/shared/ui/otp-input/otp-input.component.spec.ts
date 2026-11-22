import { TestBed } from '@angular/core/testing';
import { OtpInputComponent } from './otp-input.component';

describe('OTP y respaldo en un único control accesible', () => {
  it('permite pegar, corregir y borrar OTP, limita seis dígitos y conserva el bloqueo', () => {
    const page = TestBed.createComponent(OtpInputComponent);
    page.componentRef.setInput('fieldId', 'otp-test');
    page.componentRef.setInput('describedBy', 'otp-help');
    page.detectChanges();
    const emitted: string[] = [];
    page.componentInstance.digitsChange.subscribe(value => emitted.push(value));
    const input = page.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '012 345678'; input.dispatchEvent(new Event('input'));
    expect(emitted).toEqual(['012345']);
    expect(input.value).toBe('012345');
    expect(input.getAttribute('aria-describedby')).toBe('otp-help');
    expect(page.nativeElement.querySelectorAll('.digits > span')).toHaveLength(6);
    input.value = '01234'; input.dispatchEvent(new Event('input'));
    input.value = ''; input.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toBe('01234');
    page.componentRef.setInput('value', '01234'); page.detectChanges();
    input.value = ''; input.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toBe('');
    page.componentRef.setInput('busy', true); page.detectChanges();
    const count = emitted.length;
    input.value = '999999'; input.dispatchEvent(new Event('input'));
    expect(emitted).toHaveLength(count);
    expect(input.value).toBe('01234');
    expect(input.readOnly).toBe(true);
  });

  it('representa ocho posiciones 4–4 y preserva el texto completo de respaldo sin normalizarlo', () => {
    const page = TestBed.createComponent(OtpInputComponent);
    page.componentRef.setInput('fieldId', 'backup-test');
    page.componentRef.setInput('format', 'backup');
    page.componentRef.setInput('appearance', 'mfa');
    page.componentRef.setInput('label', 'Código de respaldo');
    page.detectChanges();
    const emitted: string[] = [];
    page.componentInstance.digitsChange.subscribe(value => emitted.push(value));
    const input = page.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'aB12-cD34'; input.dispatchEvent(new Event('input'));
    expect(emitted).toEqual(['aB12-cD34']);
    expect(input.value).toBe('aB12-cD34');
    expect(input.getAttribute('inputmode')).toBe('text');
    page.componentRef.setInput('value', input.value);
    page.componentRef.setInput('invalid', true); page.detectChanges();
    expect(page.nativeElement.querySelectorAll('.digits > span:not(.separator)')).toHaveLength(8);
    expect(page.nativeElement.querySelector('.digits').textContent.replace(/\s/g, '')).toBe('aB12-cD34');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    page.componentRef.setInput('value', 'LEGACY-CODE-12'); page.detectChanges();
    expect(page.nativeElement.querySelector('.control.plain')).not.toBeNull();
    expect(input.value).toBe('LEGACY-CODE-12');
  });
});
