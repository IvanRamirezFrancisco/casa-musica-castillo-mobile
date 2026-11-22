import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppNotificationsComponent } from '../../shared/ui/notifications/app-notifications.component';
import { NotificationService } from './notification.service';

describe('NotificationService & AppNotificationsComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [AppNotificationsComponent],
    });
  });

  afterEach(() => {
    TestBed.inject(NotificationService).clear();
    vi.useRealTimers();
  });

  it('muestra variantes success/error/warning/info, oculta automáticamente tras expirar y soporta cierre manual', () => {
    const service = TestBed.inject(NotificationService);
    const fixture = TestBed.createComponent(AppNotificationsComponent);
    fixture.detectChanges();

    const id1 = service.success('Método actualizado', 'El servidor confirmó el cambio.');
    const id2 = service.error('Error de conexión', 'No pudimos guardar.', 5500);
    fixture.detectChanges();

    const toasts = fixture.nativeElement.querySelectorAll('.cmc-toast') as NodeListOf<HTMLElement>;
    expect(toasts).toHaveLength(2);
    expect(toasts[0].getAttribute('role')).toBe('status');
    expect(toasts[0].textContent).toContain('Método actualizado');
    expect(toasts[1].getAttribute('role')).toBe('alert');
    expect(toasts[1].textContent).toContain('Error de conexión');

    // Manual close removes second toast immediately
    const closeButtons = fixture.nativeElement.querySelectorAll('.cmc-toast__close') as NodeListOf<HTMLButtonElement>;
    closeButtons[1].click();
    fixture.detectChanges();
    expect(service.notifications().some((n) => n.id === id2)).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.cmc-toast')).toHaveLength(1);

    // Success toast remains right before 4000ms and auto-dismisses at 4000ms
    vi.advanceTimersByTime(3999);
    fixture.detectChanges();
    expect(service.notifications().some((n) => n.id === id1)).toBe(true);

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(service.notifications()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.cmc-toast')).toBeNull();
  });

  it('limita la pila a 3 notificaciones, deduplica idénticas reiniciando el timer y limpia timers al destruir', () => {
    const service = TestBed.inject(NotificationService);
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    const first = service.info('Aviso 1');
    const dup = service.info('Aviso 1');
    expect(dup).toBe(first);
    expect(clearSpy).toHaveBeenCalled();

    service.warning('Aviso 2');
    service.success('Aviso 3');
    service.error('Aviso 4');
    expect(service.notifications()).toHaveLength(3);
    expect(service.notifications().map((n) => n.title)).toEqual(['Aviso 2', 'Aviso 3', 'Aviso 4']);

    clearSpy.mockClear();
    service.clear();
    expect(clearSpy).toHaveBeenCalled();
    expect(service.notifications()).toHaveLength(0);
  });
});
