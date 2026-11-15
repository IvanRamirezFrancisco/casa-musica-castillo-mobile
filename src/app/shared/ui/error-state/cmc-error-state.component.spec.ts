import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CmcErrorStateComponent } from './cmc-error-state.component';

@Component({
  selector: 'cmc-test-host',
  imports: [CmcErrorStateComponent],
  template: `<cmc-error-state heading="Sin conexión" (retry)="retries = retries + 1" />`,
})
class TestHostComponent {
  retries = 0;
}

describe('CmcErrorStateComponent', () => {
  let fixture: ComponentFixture<CmcErrorStateComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const retryButton = (): HTMLButtonElement | null => root().querySelector('button');

  beforeEach(() => {
    fixture = TestBed.createComponent(CmcErrorStateComponent);
    fixture.componentRef.setInput('heading', 'No pudimos cargar tus pedidos');
  });

  it('renders heading, description and an alert region', () => {
    fixture.componentRef.setInput('description', 'Revisa tu conexión e inténtalo de nuevo');
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')).not.toBeNull();
    expect(root().querySelector('h2')?.textContent).toContain('No pudimos cargar tus pedidos');
    expect(root().querySelector('p')?.textContent).toContain('Revisa tu conexión');
  });

  it('shows a retry button with the default label', () => {
    fixture.detectChanges();

    expect(retryButton()?.textContent).toContain('Reintentar');
  });

  it('allows customizing the retry label', () => {
    fixture.componentRef.setInput('retryLabel', 'Volver a intentar');
    fixture.detectChanges();

    expect(retryButton()?.textContent).toContain('Volver a intentar');
  });

  it('hides the retry button when showRetry is false', () => {
    fixture.componentRef.setInput('showRetry', false);
    fixture.detectChanges();

    expect(retryButton()).toBeNull();
  });

  it('emits retry once per button press', () => {
    let emissions = 0;
    fixture.componentInstance.retry.subscribe(() => emissions++);
    fixture.detectChanges();

    retryButton()?.click();

    expect(emissions).toBe(1);
  });

  it('notifies the parent through the (retry) output', () => {
    const host = TestBed.createComponent(TestHostComponent);
    host.detectChanges();

    (host.nativeElement as HTMLElement).querySelector('button')?.click();

    expect(host.componentInstance.retries).toBe(1);
  });
});
