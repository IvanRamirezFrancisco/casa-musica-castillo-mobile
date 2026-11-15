import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CmcBadgeComponent } from './cmc-badge.component';

@Component({
  selector: 'cmc-test-host',
  imports: [CmcBadgeComponent],
  template: `<cmc-badge variant="success">Pagado</cmc-badge>`,
})
class TestHostComponent {}

describe('CmcBadgeComponent', () => {
  let fixture: ComponentFixture<CmcBadgeComponent>;

  const badge = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector('.cmc-badge') as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(CmcBadgeComponent);
    fixture.detectChanges();
  });

  it('renders with the neutral variant by default', () => {
    expect(badge()).not.toBeNull();
    expect(badge().classList).toContain('cmc-badge--neutral');
  });

  it.each(['neutral', 'success', 'warning', 'error'] as const)(
    'applies the %s variant',
    (variant) => {
      fixture.componentRef.setInput('variant', variant);
      fixture.detectChanges();

      expect(badge().classList).toContain(`cmc-badge--${variant}`);
      expect(badge().className.match(/cmc-badge--/g)).toHaveLength(1);
    },
  );

  it('projects its text content', () => {
    const host = TestBed.createComponent(TestHostComponent);
    host.detectChanges();

    const el = host.nativeElement as HTMLElement;
    expect(el.querySelector('.cmc-badge--success')?.textContent).toContain('Pagado');
  });
});
