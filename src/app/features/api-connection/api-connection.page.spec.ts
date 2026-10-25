import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { ApiConnectivityService } from '../../core/api/api-connectivity.service';
import { ApiError } from '../../core/api/api-error';
import { ApiConnectionPage } from './api-connection.page';

describe('ApiConnectionPage', () => {
  function setup() {
    const response = new Subject<number>();
    const check = vi.fn(() => response);
    TestBed.configureTestingModule({ providers: [
      { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      { provide: ApiConnectivityService, useValue: { check } },
    ] });
    const fixture = TestBed.createComponent(ApiConnectionPage);
    fixture.detectChanges();
    return { fixture, response, check, button: fixture.nativeElement.querySelector('button') as HTMLButtonElement };
  }

  it('solo consulta al pulsar, bloquea duplicados y presenta el resultado', () => {
    const { fixture, response, check, button } = setup();
    expect(check).not.toHaveBeenCalled();
    button.click();
    button.click();
    expect(check).toHaveBeenCalledTimes(1);
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    response.next(3);
    response.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Categorías recibidas: 3');
    expect(button.disabled).toBe(false);
  });

  it('muestra el error y permite otra prueba', () => {
    const { fixture, response, button } = setup();
    button.click();
    response.error(new ApiError('connection', 0));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo conectar');
    expect(button.disabled).toBe(false);
  });

  it('cancela la suscripción al salir del diagnóstico', () => {
    const { fixture, response, button } = setup();
    button.click();
    expect(response.observed).toBe(true);
    fixture.destroy();
    expect(response.observed).toBe(false);
  });
});
