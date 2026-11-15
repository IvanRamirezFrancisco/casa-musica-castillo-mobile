import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CmcLoadingComponent } from './cmc-loading.component';

describe('CmcLoadingComponent', () => {
  let fixture: ComponentFixture<CmcLoadingComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(CmcLoadingComponent);
  });

  it('renders a decorative spinner inside a polite status region', () => {
    fixture.detectChanges();

    const status = root().querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(root().querySelector('ion-spinner')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('announces a fallback "Cargando" text when no message is given', () => {
    fixture.detectChanges();

    expect(root().querySelector('.cmc-loading__sr-only')?.textContent).toContain('Cargando');
    expect(root().querySelector('.cmc-loading__message')).toBeNull();
  });

  it('shows the optional message instead of the fallback', () => {
    fixture.componentRef.setInput('message', 'Cargando tu pedido...');
    fixture.detectChanges();

    expect(root().querySelector('.cmc-loading__message')?.textContent).toContain(
      'Cargando tu pedido...',
    );
    expect(root().querySelector('.cmc-loading__sr-only')).toBeNull();
  });

  it('pauses the spinner when the user prefers reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({ matches: query.includes('reduce'), media: query }) as MediaQueryList);

    try {
      const reduced = TestBed.createComponent(CmcLoadingComponent);
      reduced.detectChanges();

      const spinner = (reduced.nativeElement as HTMLElement).querySelector(
        'ion-spinner',
      ) as HTMLElement & { paused: boolean };
      expect(spinner.paused).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });

  it('keeps the spinner animated by default', () => {
    fixture.detectChanges();

    const spinner = root().querySelector('ion-spinner') as HTMLElement & { paused: boolean };
    expect(spinner.paused).toBe(false);
  });
});
