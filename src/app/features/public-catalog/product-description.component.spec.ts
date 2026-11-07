import { TestBed } from '@angular/core/testing';
import { ProductDescriptionComponent } from './product-description.component';

describe('Descripción de producto', () => {
  function render(description: string): HTMLElement {
    const fixture = TestBed.createComponent(ProductDescriptionComponent);
    fixture.componentRef.setInput('description', description);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra texto plano y una alternativa para descripción vacía', () => {
    expect(render('Audio & música').textContent).toContain('Audio & música');
    expect(render('').textContent).toContain('Descripción no disponible.');
  });

  it('formatea párrafos, listas y anidación, incluso con cierres implícitos', () => {
    const result = render('<p>El <b>Yamaha <em>PSR</em></b>&nbsp;digital<br>Ligero<ol><li>Uno<li>Dos</ol><ul><li>Tres</li></ul>');
    expect(result.querySelector('p strong em')?.textContent).toBe('PSR');
    expect(result.querySelector('p br')).not.toBeNull();
    expect(result.querySelectorAll('ol li')).toHaveLength(2);
    expect(result.querySelector('ul li')?.textContent).toBe('Tres');
    expect(result.textContent).toContain('Yamaha PSR\u00a0digital');
  });

  it('conserva HTML no permitido como texto y descarta atributos de etiquetas permitidas', () => {
    const unsafe = '<script>unsafe()</script><img src=x onerror=unsafe()><a href="javascript:unsafe()">enlace</a>';
    const result = render('<p onclick="unsafe()">Seguro</p>' + unsafe);
    expect(result.textContent).toContain(unsafe);
    expect(result.querySelector('script,img,a,[onclick],[onerror],[href]')).toBeNull();
    expect(result.querySelector('p')?.textContent).toBe('Seguro');
  });
});
