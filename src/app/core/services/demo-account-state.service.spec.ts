import { TestBed } from '@angular/core/testing';
import { DemoAccountStateService, orderSubtotal, orderItemCount } from './demo-account-state.service';

describe('UNITARIAS HU12-HU14: cuenta DEMO', () => {
  it('suma unidades e importes incluyendo listas vacías', () => {
    const items = [{ id: '1', name: 'Guitarra', unitPrice: 100, quantity: 2 },
      { id: '2', name: 'Teclado', unitPrice: 250, quantity: 3 }];
    expect(orderSubtotal(items)).toBe(950);
    expect(orderItemCount(items)).toBe(5);
    expect(orderSubtotal([])).toBe(0);
    expect(orderItemCount([])).toBe(0);
  });
  it('resuelve solo IDs existentes en el conjunto demo', () => {
    const service = TestBed.inject(DemoAccountStateService);
    expect(service.getOrder(service.orders()[0].id)).toEqual(service.orders()[0]);
    expect(service.getOrder('unknown')).toBeUndefined();
  });
  it('copia el perfil para evitar mutación accidental desde el formulario', () => {
    const service = TestBed.inject(DemoAccountStateService);
    const profile = { name: 'Prueba', email: 'qa@example.test', phone: '5551234567' };
    service.updateProfile(profile);
    profile.name = 'Cambio externo';
    expect(service.profile().name).toBe('Prueba');
  });
});
