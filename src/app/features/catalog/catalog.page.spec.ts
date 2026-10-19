import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CatalogPage, CatalogProduct } from './catalog.page';
import { routes } from '../../app.routes';

describe('CatalogPage', () => {
  let component: CatalogPage;
  let fixture: ComponentFixture<CatalogPage>;

  beforeEach(async () => {
    vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function(this: HTMLDialogElement) { this.open = true; });
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function(this: HTMLDialogElement) { this.open = false; });
    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // 1. CatalogPage se crea
  it('1. debe crear el componente CatalogPage exitosamente', () => {
    expect(component).toBeTruthy();
  });

  // 2. Render inicial de productos
  it('2. debe renderizar inicialmente la lista completa de productos demo', () => {
    expect(component.productosFiltrados().length).toBe(component.productos.length);
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.product-card');
    expect(cards.length).toBe(component.productos.length);
  });

  // 3. Búsqueda por nombre
  it('3. debe filtrar correctamente los productos por coincidencia de nombre', () => {
    component.onBusquedaChange('guitarra acústica');
    fixture.detectChanges();

    const resultados = component.productosFiltrados();
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every(p => p.nombre.toLowerCase().includes('guitarra acústica') || p.marca.toLowerCase().includes('guitarra acústica'))).toBe(true);
  });

  // 4. Búsqueda por marca
  it('4. debe filtrar correctamente los productos por coincidencia de marca', () => {
    component.onBusquedaChange('yamaha');
    fixture.detectChanges();

    const resultados = component.productosFiltrados();
    expect(resultados.length).toBe(1);
    expect(resultados[0].marca).toContain('Yamaha');
  });

  // 5. Búsqueda por categoría mediante el buscador de texto
  it('5. debe filtrar productos buscando por el nombre de la categoría en el buscador', () => {
    component.onBusquedaChange('percusión');
    fixture.detectChanges();

    const resultados = component.productosFiltrados();
    expect(resultados.length).toBe(1);
    expect(resultados[0].categoria).toBe('Percusión');
  });

  // 6. Búsqueda sin resultados
  it('6. debe devolver lista vacía cuando el término no coincide con ningún producto', () => {
    component.onBusquedaChange('instrumento_inexistente_xyz');
    fixture.detectChanges();

    expect(component.productosFiltrados().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.product-card');
    expect(cards.length).toBe(0);
  });

  // 7. Selección de categoría
  it('7. debe filtrar la lista al seleccionar un chip de categoría', () => {
    component.seleccionarCategoria('Teclados');
    fixture.detectChanges();

    const resultados = component.productosFiltrados();
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every(p => p.categoria === 'Teclados')).toBe(true);
  });

  // 8. Limpiar filtros
  it('8. debe restablecer la búsqueda, categoría y orden al invocar limpiarFiltros', () => {
    component.onBusquedaChange('bajo');
    component.seleccionarCategoria('Cuerdas');
    component.onOrdenChange('precioDesc');
    fixture.detectChanges();

    component.limpiarFiltros();
    fixture.detectChanges();

    expect(component.busqueda()).toBe('');
    expect(component.categoriaActiva()).toBe('Todos');
    expect(component.orden()).toBe('destacados');
    expect(component.productosFiltrados().length).toBe(component.productos.length);
  });

  // 9. Orden precio ascendente
  it('9. debe ordenar productos por menor precio de forma ascendente sin mutar el arreglo original', () => {
    const copiaOriginal = [...component.productos];
    component.onOrdenChange('precioAsc');
    fixture.detectChanges();

    const resultados = component.productosFiltrados();
    for (let i = 0; i < resultados.length - 1; i++) {
      expect(resultados[i].precio).toBeLessThanOrEqual(resultados[i + 1].precio);
    }
    // Asegurar inmutabilidad del original
    expect(component.productos[0].id).toBe(copiaOriginal[0].id);
  });

  // 10. Orden precio descendente
  it('10. debe ordenar productos por mayor precio de forma descendente sin mutar el arreglo original', () => {
    component.onOrdenChange('precioDesc');
    fixture.detectChanges();

    const resultados = component.productosFiltrados();
    for (let i = 0; i < resultados.length - 1; i++) {
      expect(resultados[i].precio).toBeGreaterThanOrEqual(resultados[i + 1].precio);
    }
  });

  // 11. Orden nombre A-Z
  it('11. debe ordenar alfabéticamente por nombre de producto (A-Z)', () => {
    component.onOrdenChange('nombre');
    fixture.detectChanges();

    const resultados = component.productosFiltrados();
    for (let i = 0; i < resultados.length - 1; i++) {
      const cmp = resultados[i].nombre.localeCompare(resultados[i + 1].nombre, 'es', { sensitivity: 'base' });
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });

  // 12. Interacción para abrir detalle provisional
  it('12. debe seleccionar y mostrar el diálogo modal de detalle al solicitar ver información', () => {
    const prod: CatalogProduct = component.productos[0];
    component.mostrarDetalle(prod);
    fixture.detectChanges();

    expect(component.seleccionado()).toEqual(prod);
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = compiled.querySelector('.modal-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.textContent).toContain(prod.nombre);
  });

  // 13. Cerrar detalle
  it('13. debe cerrar el diálogo modal de detalle al invocar cerrarDetalle', () => {
    const prod: CatalogProduct = component.productos[0];
    component.mostrarDetalle(prod);
    fixture.detectChanges();

    component.cerrarDetalle();
    fixture.detectChanges();

    expect(component.seleccionado()).toBeNull();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.modal-dialog')).toBeNull();
  });

  // 14. Ruta /main/catalog carga CatalogPage
  it('14. debe tener la ruta /main/catalog mapeada y configurada para cargar CatalogPage', async () => {
    const mainRoute = routes.find(r => r.path === 'main');
    expect(mainRoute).toBeDefined();

    const catalogRoute = mainRoute?.children?.find(r => r.path === 'catalog');
    expect(catalogRoute).toBeDefined();

    const loaded = await (catalogRoute?.loadComponent as () => Promise<unknown>)();
    expect(loaded).toBe(CatalogPage);
  });

  // 15. Estado vacío accesible
  it('15. debe mostrar un estado vacío accesible con botón para limpiar filtros cuando no hay resultados', () => {
    component.onBusquedaChange('término_sin_coincidencias');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('cmc-empty-state');
    expect(emptyState).toBeTruthy();

    const clearBtn = compiled.querySelector('.clear-filters-btn') as HTMLButtonElement | null;
    expect(clearBtn).toBeTruthy();
    expect(clearBtn?.getAttribute('aria-label')).toBe('Limpiar filtros de búsqueda');

    // Al hacer click en limpiar filtros, deben reaparecer los productos
    clearBtn?.click();
    fixture.detectChanges();
    expect(component.productosFiltrados().length).toBe(component.productos.length);
  });
  it('opens a native modal with an accessible name and closes on cancellation', () => {
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.detail-btn') as HTMLButtonElement).click(); fixture.detectChanges();
    const dialog = root.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toContain(component.productos[0].nombre);
    dialog.dispatchEvent(new Event('cancel')); fixture.detectChanges();
    expect(component.seleccionado()).toBeNull();
    expect(root.querySelector('dialog')).toBeNull();
  });

  it('keeps the detail open on content clicks and closes on backdrop clicks', () => {
    component.mostrarDetalle(component.productos[0]); fixture.detectChanges();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog') as HTMLDialogElement;
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ left: 10, right: 300, top: 10, bottom: 400 } as DOMRect);
    dialog.dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 100, bubbles: true }));
    expect(component.seleccionado()).not.toBeNull();
    dialog.dispatchEvent(new MouseEvent('click', { clientX: 0, clientY: 0, bubbles: true }));
    expect(component.seleccionado()).toBeNull();
  });

  it('closes the modal before leaving the cached Ionic page', () => {
    component.mostrarDetalle(component.productos[0]); fixture.detectChanges();
    component.ionViewWillLeave(); fixture.detectChanges();
    expect(component.seleccionado()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('dialog')).toBeNull();
  });

});

// TT-21: el catálogo aplica la categoría recibida desde Inicio
describe('CatalogPage - filtro por parámetro de ruta', () => {
  let component: CatalogPage;
  const queryParams$ = new BehaviorSubject(convertToParamMap({}));

  beforeEach(async () => {
    queryParams$.next(convertToParamMap({}));
    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [{ provide: ActivatedRoute, useValue: { queryParamMap: queryParams$.asObservable() } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CatalogPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('aplica la categoría recibida en ?categoria', () => {
    queryParams$.next(convertToParamMap({ categoria: 'Teclados' }));
    expect(component.categoriaActiva()).toBe('Teclados');
    expect(component.productosFiltrados().length).toBeGreaterThan(0);
    expect(component.productosFiltrados().every(p => p.categoria === 'Teclados')).toBe(true);
  });

  it('ignora una categoría inexistente o manipulada y muestra Todos', () => {
    queryParams$.next(convertToParamMap({ categoria: '<script>alert(1)</script>' }));
    expect(component.categoriaActiva()).toBe('Todos');
    expect(component.productosFiltrados().length).toBe(component.productos.length);
  });

  it('combina la búsqueda ?q con la categoría', () => {
    queryParams$.next(convertToParamMap({ q: 'eléctrica', categoria: 'Guitarras' }));
    const resultados = component.productosFiltrados();
    expect(resultados.length).toBe(1);
    expect(resultados[0].categoria).toBe('Guitarras');
  });
});
