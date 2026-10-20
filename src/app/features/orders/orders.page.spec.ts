import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { OrdersPage } from './orders.page';
import { OrdersService } from '../../core/services/orders.service';
import { DemoAccountOrder } from '../../core/models/account.model';
import { DemoAccountStateService } from '../../core/services/demo-account-state.service';

describe('OrdersPage', () => {
  let component: OrdersPage;
  let fixture: ComponentFixture<OrdersPage>;
  let listMyOrders: ReturnType<typeof vi.fn>;
  let demoOrders: DemoAccountOrder[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const create = () => {
    fixture = TestBed.createComponent(OrdersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };
  const flush = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    listMyOrders = vi.fn();
    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [
        provideRouter([]),
        { provide: OrdersService, useValue: { listMyOrders } },
      ]
    }).compileComponents();
    demoOrders = TestBed.inject(DemoAccountStateService).orders();
  });

  it('should create', () => {
    listMyOrders.mockResolvedValue(demoOrders);
    create();
    expect(component).toBeTruthy();
  });

  it('muestra un estado de carga mientras consulta los pedidos', () => {
    listMyOrders.mockReturnValue(new Promise(() => undefined));
    create();
    expect(component.status()).toBe('loading');
    expect(root().querySelector('cmc-loading')?.textContent).toContain('Cargando tus pedidos');
    expect(root().querySelector('.order-list')).toBeNull();
  });

  // PF-HU12-01
  it('lista los pedidos con su resumen, del más reciente al más antiguo', async () => {
    const desordenados = [...demoOrders].reverse();
    listMyOrders.mockResolvedValue(desordenados);
    create();
    await flush();

    expect(component.status()).toBe('ready');
    const ids = [...root().querySelectorAll('.order-id')].map((el) => el.textContent?.trim());
    expect(ids).toEqual(['DEMO-1004', 'DEMO-1003', 'DEMO-1002', 'DEMO-1001']);
    const primera = root().querySelector('.order-card') as HTMLElement;
    expect(primera.textContent).toContain('Pendiente');
    expect(primera.textContent).toContain('28/09/2026');
    expect(primera.textContent).toContain('1 artículo');
  });

  it('permite abrir el detalle de cada pedido', async () => {
    listMyOrders.mockResolvedValue(demoOrders);
    create();
    await flush();
    const enlace = root().querySelector('.order-card') as HTMLAnchorElement;
    expect(enlace.getAttribute('href')).toBe('/orders/DEMO-1004');
    expect(enlace.getAttribute('aria-label')).toBe('Pedido DEMO-1004');
  });

  // PF-HU12-02
  it('muestra el estado vacío cuando el usuario no tiene pedidos', async () => {
    listMyOrders.mockResolvedValue([]);
    create();
    await flush();
    expect(root().querySelector('cmc-empty-state')?.textContent).toContain('Aún no tienes pedidos');
  });

  // PF-HU12-03
  it('muestra un error controlado sin detalles técnicos cuando falla la consulta', async () => {
    listMyOrders.mockRejectedValue(new Error('HTTP 500 /api/orders?userId=7'));
    create();
    await flush();
    expect(component.status()).toBe('error');
    expect(root().querySelector('cmc-error-state')?.textContent).toContain('No pudimos cargar tus pedidos');
    expect(root().textContent).not.toContain('HTTP 500');
    expect(root().textContent).not.toContain('/api/');
  });

  it('vuelve a consultar los pedidos al presionar Reintentar', async () => {
    listMyOrders.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(demoOrders);
    create();
    await flush();
    (root().querySelector('cmc-error-state button') as HTMLButtonElement).click();
    await flush();
    expect(listMyOrders).toHaveBeenCalledTimes(2);
    expect(component.status()).toBe('ready');
    expect(root().querySelectorAll('.order-card').length).toBe(demoOrders.length);
  });
});
