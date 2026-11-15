import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { CmcInputComponent } from './cmc-input.component';

@Component({
  selector: 'cmc-test-host',
  imports: [CmcInputComponent, ReactiveFormsModule],
  template: `<cmc-input label="Correo" [formControl]="control" [error]="error" />`,
})
class TestHostComponent {
  readonly control = new FormControl<string>('', { nonNullable: true });
  error = '';
}

describe('CmcInputComponent', () => {
  describe('standalone', () => {
    let fixture: ComponentFixture<CmcInputComponent>;

    const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const inputEl = (): HTMLInputElement => root().querySelector('input') as HTMLInputElement;

    beforeEach(() => {
      fixture = TestBed.createComponent(CmcInputComponent);
      fixture.componentRef.setInput('label', 'Correo electrónico');
      fixture.detectChanges();
    });

    it('renders a label correctly associated with the input', () => {
      const label = root().querySelector('label') as HTMLLabelElement;

      expect(label.textContent).toContain('Correo electrónico');
      expect(inputEl().id).not.toBe('');
      expect(label.htmlFor).toBe(inputEl().id);
    });

    it('generates unique ids per instance', () => {
      const other = TestBed.createComponent(CmcInputComponent);
      other.componentRef.setInput('label', 'Otro');
      other.detectChanges();

      const otherInput = (other.nativeElement as HTMLElement).querySelector('input');
      expect(otherInput?.id).not.toBe(inputEl().id);
    });

    it('applies type, placeholder, autocomplete and required', () => {
      fixture.componentRef.setInput('type', 'email');
      fixture.componentRef.setInput('placeholder', 'nombre@correo.com');
      fixture.componentRef.setInput('autocomplete', 'email');
      fixture.componentRef.setInput('required', true);
      fixture.detectChanges();

      expect(inputEl().type).toBe('email');
      expect(inputEl().placeholder).toBe('nombre@correo.com');
      expect(inputEl().getAttribute('autocomplete')).toBe('email');
      expect(inputEl().required).toBe(true);
      expect(root().querySelector('.cmc-input__required')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    });

    it('links the hint through aria-describedby when there is no error', () => {
      fixture.componentRef.setInput('hint', 'Usaremos este correo para contactarte');
      fixture.detectChanges();

      const describedBy = inputEl().getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(root().querySelector(`#${describedBy}`)?.textContent).toContain('contactarte');
      expect(inputEl().getAttribute('aria-invalid')).toBeNull();
    });

    it('shows an accessible error: aria-invalid, alert role and aria-describedby', () => {
      fixture.componentRef.setInput('hint', 'Una pista');
      fixture.componentRef.setInput('error', 'Correo inválido');
      fixture.detectChanges();

      const message = root().querySelector('.cmc-input__message--error') as HTMLElement;
      expect(inputEl().getAttribute('aria-invalid')).toBe('true');
      expect(message.getAttribute('role')).toBe('alert');
      expect(message.textContent).toContain('Correo inválido');
      expect(inputEl().getAttribute('aria-describedby')).toBe(message.id);
      expect(root().textContent).not.toContain('Una pista');
    });

    it('has no aria-describedby without hint or error', () => {
      expect(inputEl().getAttribute('aria-describedby')).toBeNull();
    });

    it('disables the native input through the disabled input', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(inputEl().disabled).toBe(true);
      expect(root().querySelector('.cmc-input__field--disabled')).not.toBeNull();
    });
  });

  describe('with Reactive Forms', () => {
    let fixture: ComponentFixture<TestHostComponent>;
    let host: TestHostComponent;

    const inputEl = (): HTMLInputElement =>
      (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;

    beforeEach(() => {
      fixture = TestBed.createComponent(TestHostComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('writes control values to the DOM and marks the field as filled', async () => {
      host.control.setValue('ana@correo.com');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(inputEl().value).toBe('ana@correo.com');
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('.cmc-input__field--filled'),
      ).not.toBeNull();
    });

    it('propagates user typing to the control', () => {
      inputEl().value = 'luis@correo.com';
      inputEl().dispatchEvent(new Event('input'));

      expect(host.control.value).toBe('luis@correo.com');
    });

    it('marks the control as touched on blur', () => {
      expect(host.control.touched).toBe(false);

      inputEl().dispatchEvent(new Event('blur'));

      expect(host.control.touched).toBe(true);
    });

    it('reflects control.disable() / enable() in the DOM', () => {
      host.control.disable();
      fixture.detectChanges();
      expect(inputEl().disabled).toBe(true);

      host.control.enable();
      fixture.detectChanges();
      expect(inputEl().disabled).toBe(false);
    });

    it('resets to an empty value when the control is set to null', async () => {
      host.control.setValue('algo');
      fixture.detectChanges();
      host.control.reset();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(inputEl().value).toBe('');
    });
  });
});
