import { TestBed } from '@angular/core/testing';
import { PublicImageComponent } from './public-product-grid.component';

describe('Fotografía pública de producto', () => {
  it('expone una alternativa cuando falta o falla la fotografía autorizada', () => {
    const fixture = TestBed.createComponent(PublicImageComponent);
    fixture.componentRef.setInput('alt', 'Yamaha');
    fixture.detectChanges();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelector('[role=img]')?.getAttribute('aria-label')).toBe('Yamaha: imagen no disponible');

    fixture.componentRef.setInput('src', 'https://res.cloudinary.com/catalog-test/photo.jpg');
    fixture.detectChanges();
    const image = view.querySelector('img');
    expect(image?.alt).toBe('Yamaha');
    image?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(view.querySelector('img')).toBeNull();
    expect(view.querySelector('[role=img]')?.getAttribute('aria-label')).toBe('Yamaha: imagen no disponible');
  });
});
