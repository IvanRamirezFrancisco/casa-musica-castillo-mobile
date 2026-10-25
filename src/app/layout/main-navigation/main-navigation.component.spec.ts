import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainNavigationComponent } from './main-navigation.component';
import { provideRouter } from '@angular/router';
import { DemoCheckoutStateService } from '../../core/services/demo-checkout-state.service';

describe('MainNavigationComponent', () => {
  let component: MainNavigationComponent;
  let fixture: ComponentFixture<MainNavigationComponent>;
  let checkout: DemoCheckoutStateService;

  const badge = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('.cart-badge');
  const cartStatus = (): string | undefined =>
    (fixture.nativeElement as HTMLElement).querySelector('.cart-sr-only')?.textContent?.trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainNavigationComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MainNavigationComponent);
    component = fixture.componentInstance;
    checkout = TestBed.inject(DemoCheckoutStateService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('conserva exactamente los cinco destinos de navegación principal', () => {
    const tabs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('ion-tab-button'));
    expect(tabs.map(tab => tab.getAttribute('tab'))).toEqual(['home', 'catalog', 'cart', 'orders', 'profile']);
    expect(tabs.map(tab => tab.querySelector('ion-label')?.textContent)).toEqual(['Inicio', 'Catálogo', 'Carrito', 'Pedidos', 'Perfil']);
  });

  // TT-36: indicador del carrito
  it('muestra en el indicador las unidades del carrito DEMO', () => {
    expect(badge()?.textContent?.trim()).toBe('2');
    expect(cartStatus()).toBe(', 2 productos');
  });

  it('actualiza el indicador cuando cambia la cantidad de un producto', () => {
    checkout.updateQuantity('p1', 2);
    fixture.detectChanges();
    expect(badge()?.textContent?.trim()).toBe('4');
    expect(cartStatus()).toBe(', 4 productos');
  });

  it('usa singular cuando queda un solo producto', () => {
    checkout.removeItem('p3');
    fixture.detectChanges();
    expect(badge()?.textContent?.trim()).toBe('1');
    expect(cartStatus()).toBe(', 1 producto');
  });

  it('oculta el indicador cuando el carrito queda vacío', () => {
    checkout.clearCheckout();
    fixture.detectChanges();
    expect(badge()).toBeNull();
    expect(cartStatus()).toBe(', vacío');
  });

  it('limita el texto del indicador a 99+', () => {
    checkout.updateQuantity('p1', 150);
    fixture.detectChanges();
    expect(badge()?.textContent?.trim()).toBe('99+');
  });
});
