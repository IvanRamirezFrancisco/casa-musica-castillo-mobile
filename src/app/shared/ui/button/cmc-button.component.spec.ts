import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { CmcButtonComponent } from './cmc-button.component';

@Component({
  selector: 'cmc-test-host',
  imports: [CmcButtonComponent, FormsModule],
  template: `
    <form (ngSubmit)="submits.set(submits() + 1)">
      <cmc-button
        type="submit"
        [loading]="loading()"
        [disabled]="disabled()"
        (click)="clicks.set(clicks() + 1)"
      >
        Guardar
      </cmc-button>
    </form>
  `,
})
class TestHostComponent {
  readonly clicks = signal(0);
  readonly submits = signal(0);
  readonly loading = signal(false);
  readonly disabled = signal(false);
}

describe('CmcButtonComponent', () => {
  describe('standalone', () => {
    let fixture: ComponentFixture<CmcButtonComponent>;

    const nativeButton = (): HTMLButtonElement =>
      (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;

    beforeEach(() => {
      fixture = TestBed.createComponent(CmcButtonComponent);
      fixture.detectChanges();
    });

    it('renders a native button of type "button" with the primary default variant', () => {
      expect(nativeButton()).not.toBeNull();
      expect(nativeButton().getAttribute('type')).toBe('button');
      expect(nativeButton().classList).toContain('cmc-button--primary');
      expect(nativeButton().classList).toContain('cmc-button--default');
    });

    it('applies the requested variant and size', () => {
      fixture.componentRef.setInput('variant', 'ghost');
      fixture.componentRef.setInput('size', 'compact');
      fixture.detectChanges();

      expect(nativeButton().classList).toContain('cmc-button--ghost');
      expect(nativeButton().classList).toContain('cmc-button--compact');
      expect(nativeButton().classList).not.toContain('cmc-button--primary');
    });

    it('supports type="submit"', () => {
      fixture.componentRef.setInput('type', 'submit');
      fixture.detectChanges();

      expect(nativeButton().getAttribute('type')).toBe('submit');
    });

    it('disables the native button', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(nativeButton().disabled).toBe(true);
    });

    it('exposes loading state accessibly without disabling focus', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.componentRef.setInput('loadingLabel', 'Guardando');
      fixture.detectChanges();

      const button = nativeButton();
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.disabled).toBe(false);
      expect(button.textContent).toContain('Guardando');
      expect(button.querySelector('.cmc-button__spinner')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    });

    it('does not expose busy/disabled aria attributes when idle', () => {
      expect(nativeButton().getAttribute('aria-busy')).toBeNull();
      expect(nativeButton().getAttribute('aria-disabled')).toBeNull();
    });
  });

  describe('inside a host', () => {
    let fixture: ComponentFixture<TestHostComponent>;
    let host: TestHostComponent;

    const nativeButton = (): HTMLButtonElement =>
      (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;

    beforeEach(() => {
      fixture = TestBed.createComponent(TestHostComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('projects the label and emits click and submit when active', () => {
      expect(nativeButton().textContent).toContain('Guardar');

      nativeButton().click();
      fixture.detectChanges();

      expect(host.clicks()).toBe(1);
      expect(host.submits()).toBe(1);
    });

    it('ignores activations while loading (no click bubbling, no submit)', () => {
      host.loading.set(true);
      fixture.detectChanges();

      nativeButton().click();
      nativeButton().click();
      fixture.detectChanges();

      expect(host.clicks()).toBe(0);
      expect(host.submits()).toBe(0);
    });

    it('ignores activations while disabled', () => {
      host.disabled.set(true);
      fixture.detectChanges();

      nativeButton().click();
      fixture.detectChanges();

      expect(host.clicks()).toBe(0);
      expect(host.submits()).toBe(0);
    });
  });
});
