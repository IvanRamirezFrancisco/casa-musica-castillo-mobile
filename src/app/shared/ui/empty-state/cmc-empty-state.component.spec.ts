import { ComponentFixture, TestBed } from '@angular/core/testing';
import { cartOutline } from 'ionicons/icons';

import { CmcEmptyStateComponent } from './cmc-empty-state.component';

describe('CmcEmptyStateComponent', () => {
  let fixture: ComponentFixture<CmcEmptyStateComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(CmcEmptyStateComponent);
    fixture.componentRef.setInput('heading', 'Tu carrito está vacío');
  });

  it('renders the heading and the description', () => {
    fixture.componentRef.setInput('description', 'Agrega productos para comenzar');
    fixture.detectChanges();

    expect(root().querySelector('h2')?.textContent).toContain('Tu carrito está vacío');
    expect(root().querySelector('p')?.textContent).toContain('Agrega productos para comenzar');
  });

  it('omits the description and icon when they are not provided', () => {
    fixture.detectChanges();

    expect(root().querySelector('h2')?.textContent).toContain('Tu carrito está vacío');
    expect(root().querySelector('p')).toBeNull();
    expect(root().querySelector('ion-icon')).toBeNull();
  });

  it('renders a decorative icon when provided', () => {
    fixture.componentRef.setInput('icon', cartOutline);
    fixture.detectChanges();

    const icon = root().querySelector('ion-icon');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not set a title attribute on the host (no native tooltip)', () => {
    fixture.detectChanges();

    expect(root().hasAttribute('title')).toBe(false);
  });
});
