import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { OrderDetailPage } from './order-detail.page';
import { OrderDetailService } from '../../../core/services/order-detail.service';
import { DemoAccountStateService } from '../../../core/services/demo-account-state.service';

describe('OrderDetailPage', () => {
  let component: OrderDetailPage;
  let fixture: ComponentFixture<OrderDetailPage>;
  let getMyOrder: ReturnType<typeof vi.fn>;
  let routeId: string;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const create = () => {
    fixture = TestBed.createComponent(OrderDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };
  const flush = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    routeId = 'DEMO-1004';
    getMyOrder = vi.fn();
    await TestBed.configureTestingModule({
      imports: [OrderDetailPage],
      providers: [
        provideRouter([]),
        { provide: OrderDetailService, useValue: { getMyOrder } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => routeId } } } },
      ]
    }).compileComponents();
  });

  const pedidoDemo = (id: string) => TestBed.inject(DemoAccountStateService).getOrder(id) ?? null;

  it('should create', () => {
    getMyOrder.mockResolvedValue(pedidoDemo('DEMO-1004'));
    create();
    expect(component).toBeTruthy();
  });

  it('muestra un estado de carga mientras consulta el pedido', () => {
    getMyOrder.mockReturnValue(new Promise(() => undefined));
    create();
    expect(component.status()).toBe('loading');
    expect(root().querySelector('cmc-loading')?.textContent).toContain('Cargando el pedido');
  });

  // PF-HU13-01
  it('muestra los datos, partidas e importes del pedido solicitado', async () => {
    getMyOrder.mockResolvedValue(pedidoDemo('DEMO-1004'));
    create();
    await flush();

    expect(getMyOrder).toHaveBeenCalledWith('DEMO-1004');
    expect(component.status()).toBe('ready');
    expect(component.subtotal()).toBe(7200);
    expect(component.total()).toBe(7350);
    const texto = root().textContent ?? '';
    expect(texto).toContain('DEMO-1004');
    expect(texto).toContain('Teclado Roland GO');
    expect(texto).toContain('Envío a domicilio');
    expect(texto).toContain('Transferencia bancaria');
  });

  // PF-HU13-02
  it('muestra una respuesta controlada para un pedido inexistente', async () => {
    routeId = 'DEMO-9999';
    getMyOrder.mockResolvedValue(null);
    create();
    await flush();
    expect(component.status()).toBe('not-found');
    expect(root().querySelector('cmc-empty-state')?.textContent).toContain('Pedido no encontrado');
  });

  // PS-HU13-01 (nivel UI)
  it('no repite en pantalla un identificador manipulado', async () => {
    routeId = '<img src=x onerror=alert(1)>';
    getMyOrder.mockResolvedValue(null);
    create();
    await flush();
    expect(component.status()).toBe('not-found');
    expect(root().textContent).not.toContain('onerror');
    expect(root().querySelector('img')).toBeNull();
  });

  // PF-HU13-03
  it('muestra un error controlado sin detalles técnicos y permite reintentar', async () => {
    getMyOrder
      .mockRejectedValueOnce(new Error('HTTP 500 /api/orders/DEMO-1004'))
      .mockResolvedValueOnce(pedidoDemo('DEMO-1004'));
    create();
    await flush();

    expect(component.status()).toBe('error');
    expect(root().querySelector('cmc-error-state')?.textContent).toContain('No pudimos cargar el pedido');
    expect(root().textContent).not.toContain('HTTP 500');

    (root().querySelector('cmc-error-state button') as HTMLButtonElement).click();
    await flush();
    expect(getMyOrder).toHaveBeenCalledTimes(2);
    expect(component.status()).toBe('ready');
  });

  it('regresa a Mis pedidos', async () => {
    getMyOrder.mockResolvedValue(pedidoDemo('DEMO-1004'));
    create();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.goBack();
    expect(navigate).toHaveBeenCalledWith(['/main/orders']);
  });
});
