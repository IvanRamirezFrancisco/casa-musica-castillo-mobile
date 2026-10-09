import { ComponentFixture, TestBed } from '@angular/core/testing';

import { routes } from '../../app.routes';
import { FoundationPreviewPage } from './foundation-preview.page';

describe('FoundationPreviewPage', () => {
  let fixture: ComponentFixture<FoundationPreviewPage>;
  let page: FoundationPreviewPage;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const all = (selector: string): HTMLElement[] =>
    Array.from(root().querySelectorAll<HTMLElement>(selector));

  beforeEach(async () => {
    fixture = TestBed.createComponent(FoundationPreviewPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(page).toBeTruthy();
  });

  it('renders the header with a single h1, subtitle and description', () => {
    const headings = all('h1');

    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toContain('Casa de Música Castillo');
    expect(root().querySelector('.preview__header')?.textContent).toContain('Foundation UI');
    expect(root().textContent).toContain('Catálogo interno de componentes y estados visuales.');
  });

  it('renders every main section, each labelled by its heading', () => {
    const titles = all('section.preview__section > h2').map((h) => h.textContent?.trim());

    expect(titles).toEqual([
      'Tipografía',
      'Botones',
      'Campos de entrada',
      'Estados',
      'Carga',
      'Estado vacío',
      'Estado de error',
    ]);

    for (const section of all('section.preview__section')) {
      const labelledBy = section.getAttribute('aria-labelledby') as string;
      expect(section.querySelector(`#${labelledBy}`)).not.toBeNull();
    }
  });

  it('uses the real CMC components with the requested demo content', () => {
    // 7 demo buttons + the retry button rendered inside <cmc-error-state>.
    expect(all('cmc-button')).toHaveLength(8);
    expect(all('cmc-input')).toHaveLength(6);
    expect(all('cmc-badge')).toHaveLength(4);
    expect(all('cmc-loading')).toHaveLength(2);
    expect(all('cmc-empty-state')).toHaveLength(1);
    expect(all('cmc-error-state')).toHaveLength(1);

    // Component internals prove they are rendered, not just declared.
    expect(all('cmc-button button.cmc-button')).toHaveLength(8);
    expect(all('cmc-badge .cmc-badge--success')[0].textContent).toContain('Pagado');
    expect(root().querySelector('cmc-empty-state h2')?.textContent).toContain('No hay resultados');
  });

  it('demonstrates the button states through the public API', () => {
    const buttons = all('section[aria-labelledby="preview-buttons"] button.cmc-button');
    const byText = (text: string): HTMLButtonElement =>
      buttons.find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

    expect(byText('Deshabilitado').disabled).toBe(true);
    expect(byText('Cargando').getAttribute('aria-busy')).toBe('true');
    expect(byText('Compacto').classList).toContain('cmc-button--compact');
    expect(byText('Continuar').closest('cmc-button')?.classList).toContain(
      'cmc-button-host--full',
    );
  });

  describe('Reactive Forms demo', () => {
    const inputByLabel = (label: string): HTMLInputElement => {
      const labelEl = all('cmc-input label').find((l) => l.textContent?.includes(label));
      return root().querySelector(`#${(labelEl as HTMLLabelElement).htmlFor}`) as HTMLInputElement;
    };

    it('wires each demo state: type, hint, required, disabled and error', () => {
      expect(inputByLabel('Contraseña').type).toBe('password');
      expect(inputByLabel('Teléfono').required).toBe(true);
      expect(inputByLabel('Campo deshabilitado').disabled).toBe(true);
      expect(inputByLabel('Nombre').placeholder).toBe('Escribe tu nombre');

      const email = inputByLabel('Correo electrónico');
      expect(root().querySelector(`#${email.getAttribute('aria-describedby')}`)?.textContent).toContain(
        'Utilizaremos este correo para identificar tu cuenta.',
      );

      const invalid = inputByLabel('Correo de prueba');
      expect(invalid.getAttribute('aria-invalid')).toBe('true');
      expect(root().querySelector(`#${invalid.getAttribute('aria-describedby')}`)?.textContent).toContain(
        'Ingresa un correo electrónico válido.',
      );
    });

    it('writes the initial control value into the DOM', () => {
      expect(inputByLabel('Correo de prueba').value).toBe('correo-invalido');
    });

    it('propagates typing into the FormGroup and updates the local preview', () => {
      const preview = (): string =>
        root().querySelector('[data-testid="name-preview"]')?.textContent ?? '';
      expect(preview()).toContain('(vacío)');

      const name = inputByLabel('Nombre');
      name.value = 'Ana';
      name.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(preview()).toContain('Ana');
    });
  });

  describe('retry demo', () => {
    const counter = (): string =>
      root().querySelector('[data-testid="retry-counter"]')?.textContent?.trim() ?? '';
    const retryButton = (): HTMLButtonElement =>
      root().querySelector('cmc-error-state button') as HTMLButtonElement;

    it('starts at zero and increments on each retry', () => {
      expect(counter()).toBe('Reintentos: 0');

      retryButton().click();
      fixture.detectChanges();
      expect(counter()).toBe('Reintentos: 1');

      retryButton().click();
      fixture.detectChanges();
      expect(counter()).toBe('Reintentos: 2');
    });
  });

  describe('routing', () => {
    it('registers a lazy /foundation-preview route without altering home or the root redirect', async () => {
      const preview = routes.find((r) => r.path === 'foundation-preview');
      expect(preview?.loadComponent).toBeDefined();
      expect(await (preview?.loadComponent as () => Promise<unknown>)()).toBe(FoundationPreviewPage);

      expect(routes.find((r) => r.path === 'home')?.loadComponent).toBeDefined();
      expect(routes.find((r) => r.path === '')).toMatchObject({
        redirectTo: 'home',
        pathMatch: 'full',
      });
    });
  });
});
