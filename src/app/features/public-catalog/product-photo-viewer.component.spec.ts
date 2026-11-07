import { TestBed } from '@angular/core/testing';
import { ProductPhotoViewerComponent } from './product-photo-viewer.component';

describe('visor de fotografías', () => {
  const first = 'https://res.cloudinary.com/test/first.jpg';
  const second = 'https://res.cloudinary.com/test/second.jpg';

  function render(photos: string[]) {
    const fixture = TestBed.createComponent(ProductPhotoViewerComponent);
    fixture.componentRef.setInput('photos', photos);
    fixture.componentRef.setInput('title', 'Guitarra');
    fixture.componentRef.setInput('position', 0);
    fixture.detectChanges();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    dialog.showModal = vi.fn(() => { dialog.open = true; });
    dialog.close = vi.fn(() => { dialog.open = false; dialog.dispatchEvent(new Event('close')); });
    return { fixture, dialog };
  }

  it('omite los controles y no abre sin fotografías', () => {
    const { fixture, dialog } = render([]);
    fixture.componentInstance.open();
    expect(dialog.showModal).not.toHaveBeenCalled();
    expect(dialog.querySelector('.viewer-tools')).toBeNull();
  });

  it('amplía una sola fotografía sin mostrar navegación y restablece al cerrar', () => {
    const { fixture, dialog } = render([first]);
    fixture.componentInstance.open();
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).not.toContain('Siguiente');
    dialog.querySelector<HTMLButtonElement>('[aria-label="Ampliar zoom"]')!.click();
    fixture.detectChanges();
    expect(dialog.querySelector<HTMLElement>('.viewer-photo')!.style.width).toBe('150%');
    dialog.querySelector<HTMLButtonElement>('[aria-label="Cerrar visor"]')!.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
    expect(dialog.querySelector<HTMLElement>('.viewer-photo')!.style.width).toBe('100%');
  });

  it('notifica la selección por teclado y no avanza más allá de la última fotografía', () => {
    const { fixture, dialog } = render([first, second]);
    const change = vi.fn();
    fixture.componentInstance.photoChange.subscribe(change);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(change).toHaveBeenCalledWith(second);
    fixture.componentRef.setInput('position', 1);
    fixture.detectChanges();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(change).toHaveBeenCalledTimes(1);
  });
});
