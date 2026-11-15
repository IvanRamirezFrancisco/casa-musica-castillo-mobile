import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ProductPhotoViewerComponent } from './product-photo-viewer.component';

describe('visor de fotografías', () => {
  const first = 'https://res.cloudinary.com/test/first.jpg';
  const second = 'https://res.cloudinary.com/test/second.jpg';

  function render(photos: string[]) {
    let back = () => {};
    const backSubscription = new Subscription();
    const subscribe = vi.fn((_priority: number, handler: () => void) => {
      back = handler;
      return backSubscription;
    });
    TestBed.configureTestingModule({ providers: [{ provide: Platform, useValue: { backButton: { subscribeWithPriority: subscribe } } }] });
    const fixture = TestBed.createComponent(ProductPhotoViewerComponent);
    fixture.componentRef.setInput('photos', photos);
    fixture.componentRef.setInput('title', 'Guitarra');
    fixture.componentRef.setInput('position', 0);
    fixture.detectChanges();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    dialog.showModal = vi.fn(() => { dialog.open = true; });
    dialog.close = vi.fn(() => { dialog.open = false; dialog.dispatchEvent(new Event('close')); });
    const button = (label: string) => dialog.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
    const area = () => dialog.querySelector<HTMLElement>('.viewer-image')!;
    const image = () => dialog.querySelector<HTMLImageElement>('.viewer-photo')!;
    function load(width = 600, height = 480) {
      vi.spyOn(area(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 240));
      Object.defineProperties(image(), { naturalWidth: { value: width }, naturalHeight: { value: height } });
      image().dispatchEvent(new Event('load'));
      fixture.detectChanges();
    }
    function open(opener?: HTMLElement) {
      fixture.componentInstance.open(opener);
      fixture.detectChanges();
      load();
    }
    function pointer(type: string, id: number, x: number, y: number, time = 10) {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
      Object.defineProperties(event, { pointerId: { value: id }, timeStamp: { value: time } });
      area().dispatchEvent(event);
      fixture.detectChanges();
    }
    return { fixture, dialog, button, area, image, open, load, pointer, subscribe, backSubscription, back: () => back() };
  }

  it('omite los controles y no abre sin fotografías', () => {
    const { fixture, dialog } = render([]);
    fixture.componentInstance.open();
    expect(dialog.showModal).not.toHaveBeenCalled();
    expect(dialog.querySelector('.viewer-tools')).toBeNull();
  });

  it('amplía una sola fotografía sin mostrar navegación y restablece al cerrar', () => {
    const { fixture, dialog, button, open, image } = render([first]);
    open();
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).not.toContain('Siguiente');
    dialog.querySelector<HTMLButtonElement>('[aria-label="Ampliar zoom"]')!.click();
    fixture.detectChanges();
    expect(image().style.transform).toBe('translate3d(0px, 0px, 0) scale(1.5)');
    dialog.querySelector<HTMLButtonElement>('[aria-label="Cerrar visor"]')!.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
    expect(dialog.querySelector('.viewer-photo')).toBeNull();
    open();
    expect(button('Restablecer zoom').textContent?.trim()).toBe('100 %');
  });

  it('notifica la selección por teclado y no avanza más allá de la última fotografía', () => {
    const { fixture, dialog, open } = render([first, second]);
    open();
    const change = vi.fn();
    fixture.componentInstance.photoChange.subscribe(change);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(change).toHaveBeenCalledWith(second);
    fixture.componentRef.setInput('position', 1);
    fixture.detectChanges();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(change).toHaveBeenCalledTimes(1);
  });

  it('pinch conserva el punto de encuentro y limita escala y desplazamiento a 1×–4×', () => {
    const { open, pointer, button, image } = render([first, second]);
    open();
    pointer('pointerdown', 1, 110, 120);
    pointer('pointerdown', 2, 150, 120);
    pointer('pointermove', 2, 230, 120);
    expect(button('Restablecer zoom').textContent?.trim()).toBe('300 %');
    expect(image().style.transform).toBe('translate3d(80px, 0px, 0) scale(3)');
    pointer('pointermove', 2, 350, 120);
    expect(button('Restablecer zoom').textContent?.trim()).toBe('400 %');
    expect(button('Ampliar zoom').disabled).toBe(true);
    pointer('pointermove', 2, 112, 120);
    expect(button('Restablecer zoom').textContent?.trim()).toBe('100 %');
    expect(button('Reducir zoom').disabled).toBe(true);
  });

  it('desplaza una foto ampliada sin pasar de página y acota el pan', () => {
    const { fixture, open, pointer, image, button, area } = render([first, second]);
    const change = vi.fn();
    fixture.componentInstance.photoChange.subscribe(change);
    open();
    button('Ampliar zoom').click();
    fixture.detectChanges();
    pointer('pointerdown', 1, 150, 120);
    pointer('pointermove', 1, -100, 400);
    pointer('pointerup', 1, -100, 400);
    expect(image().style.transform).toBe('translate3d(-75px, 60px, 0) scale(1.5)');
    area().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(image().style.transform).toBe('translate3d(-35px, 60px, 0) scale(1.5)');
    expect(change).not.toHaveBeenCalled();
    button('Restablecer zoom').click();
    fixture.detectChanges();
    expect(image().style.transform).toBe('translate3d(0px, 0px, 0) scale(1)');
  });

  it('enfoca el punto del doble toque y alterna entre 1× y 2×', () => {
    const { open, pointer, image } = render([first]);
    open();
    for (const time of [10, 120]) {
      pointer('pointerdown', 1, 200, 150, time);
      pointer('pointerup', 1, 200, 150, time + 20);
    }
    expect(image().style.transform).toBe('translate3d(-50px, -30px, 0) scale(2)');
    for (const time of [500, 620]) {
      pointer('pointerdown', 1, 200, 150, time);
      pointer('pointerup', 1, 200, 150, time + 20);
    }
    expect(image().style.transform).toBe('translate3d(0px, 0px, 0) scale(1)');
  });

  it('desliza solo en horizontal a 1× y descarta eventos cancelados o de un pinch', () => {
    const { fixture, open, pointer, dialog } = render([first, second]);
    const change = vi.fn();
    fixture.componentInstance.photoChange.subscribe(change);
    open();
    pointer('pointerdown', 1, 210, 40);
    pointer('pointerup', 1, 200, 180);
    pointer('pointerdown', 1, 220, 110);
    pointer('pointercancel', 1, 100, 110);
    pointer('pointerdown', 1, 220, 110);
    pointer('pointerdown', 2, 245, 110);
    pointer('pointerup', 2, 245, 110);
    pointer('pointerup', 1, 80, 110);
    expect(change).not.toHaveBeenCalled();
    pointer('pointerdown', 1, 220, 110);
    pointer('pointerup', 1, 80, 110);
    expect(change).toHaveBeenCalledExactlyOnceWith(second);
    expect(dialog.querySelector('[aria-label="Miniaturas"] [aria-current="true"]')?.getAttribute('aria-label')).toBe('Ver fotografía 1');
  });

  it.each([[240, 480, 120, 240], [600, 300, 300, 150]])('mantiene la proporción %i×%i', (w, h, fitW, fitH) => {
    const { fixture, dialog, load, image } = render([first]);
    fixture.componentInstance.open();
    fixture.detectChanges();
    expect(dialog.textContent).toContain('Cargando fotografía');
    load(w, h);
    expect(image().style.width).toBe(`${fitW}px`);
    expect(image().style.height).toBe(`${fitH}px`);
    expect(image().alt).toBe('Guitarra');
  });

  it('anuncia error sin permitir zoom y cierra con Atrás devolviendo el foco', () => {
    const { fixture, dialog, open, image, button, subscribe, back, backSubscription } = render([first]);
    const opener = document.createElement('button');
    fixture.nativeElement.append(opener);
    open(opener);
    const unavailable = vi.fn();
    fixture.componentInstance.photoUnavailable.subscribe(unavailable);
    image().dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(unavailable).toHaveBeenCalledWith(first);
    expect(dialog.querySelector('[role="status"]')?.textContent).toContain('no disponible');
    expect(button('Ampliar zoom').disabled).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('Fotografías de Guitarra');
    expect(subscribe).toHaveBeenCalledWith(200, expect.any(Function));
    back();
    expect(dialog.open).toBe(false);
    expect(backSubscription.closed).toBe(true);
    expect(document.activeElement).toBe(opener);
  });
});
