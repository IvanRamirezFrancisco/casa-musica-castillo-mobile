import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomePage } from './home.page';
import { provideRouter } from '@angular/router';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('ofrece acceso accesible a Favoritos sin modificar los productos destacados', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[aria-label="Abrir Favoritos"]');
    expect(link?.getAttribute('href')).toBe('/favorites');
    expect(component.featuredProducts()[0].id).toBe('p1');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have categories initialized', () => {
    expect(component.categories().length).toBeGreaterThan(0);
  });

  it('should have featured products initialized', () => {
    expect(component.featuredProducts().length).toBeGreaterThan(0);
  });
  it('toggles favorites through accessible product controls', () => {
    const button = (fixture.nativeElement as HTMLElement).querySelector('.favorite-icon') as HTMLButtonElement;
    button.click(); fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(component.favorites()).toEqual(['p1']);
    button.click(); fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(component.favorites()).toEqual([]);
  });

  it('keeps the catalog search link synchronized with typed input', () => {
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector('input') as HTMLInputElement;
    input.value = 'yamaha'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(root.querySelector('.search-submit')?.getAttribute('href')).toBe('/main/catalog?q=yamaha');
  });

  // TT-21: navegación desde Inicio hacia el catálogo filtrado
  it('usa solo categorías existentes en el filtro del catálogo', () => {
    const categoriasCatalogo = ['Guitarras', 'Teclados', 'Percusión', 'Cuerdas', 'Audio'];
    expect(component.categories().every(c => categoriasCatalogo.includes(c.name))).toBe(true);
  });

  it('enlaza cada categoría al catálogo filtrado por esa categoría', () => {
    const chips = (fixture.nativeElement as HTMLElement).querySelectorAll('.category-chip');
    expect(chips.length).toBe(component.categories().length);
    chips.forEach((chip, i) => {
      const nombre = component.categories()[i].name;
      expect(chip.getAttribute('href')).toBe(`/main/catalog?categoria=${encodeURIComponent(nombre)}`);
      expect(chip.getAttribute('aria-label')).toBe(`Ver ${nombre} en el catálogo`);
    });
  });

});
