import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { ProfileBackDirective } from './profile-back.directive';

@Component({ imports: [ProfileBackDirective], template: '<button appProfileBack>Volver</button>' })
class HostComponent {}

describe('Perfil: regreso Ionic desde la pestaña raíz', () => {
  let previous: string | null;
  let hardwareBack: (next: () => void) => void;
  const unsubscribe = vi.fn();
  const nav = { navigateBack: vi.fn() };
  const router = {
    url: '/main/profile',
    lastSuccessfulNavigation: () => previous ? {previousNavigation: {finalUrl: previous}} : null,
    serializeUrl: (value: string) => value,
  };
  beforeEach(() => {
    vi.resetAllMocks(); previous = null; router.url = '/main/profile';
    nav.navigateBack.mockResolvedValue(true);
    TestBed.configureTestingModule({providers: [
      {provide: Router, useValue: router}, {provide: NavController, useValue: nav},
      {provide: Platform, useValue: {backButton: {subscribeWithPriority: (priority: number, handler: typeof hardwareBack) => {
        expect(priority).toBe(1); hardwareBack = handler; return {unsubscribe};
      }}}},
    ]});
  });
  it.each(['/main/catalog?categoryId=20&page=2', '/favorites', '/products/313'])('regresa al destino interno previo %s sin borrar otras pestañas', async destination => {
    previous = destination;
    const f = TestBed.createComponent(HostComponent);f.detectChanges();
    f.nativeElement.querySelector('button').click();await Promise.resolve();
    expect(nav.navigateBack).toHaveBeenCalledExactlyOnceWith(destination, {replaceUrl: true});f.destroy();
  });
  it.each([null, '/login?returnUrl=/main/profile', '/register', '/main/profile', '/profile/security', '/profile/edit', '//external.test', '/unknown'])('utiliza Inicio para historial inexistente o inseguro: %s', async destination => {
    previous = destination;
    const f = TestBed.createComponent(HostComponent);f.detectChanges();
    f.nativeElement.querySelector('button').click();await Promise.resolve();
    expect(nav.navigateBack).toHaveBeenCalledExactlyOnceWith('/main/home', {replaceUrl: true});f.destroy();
  });
  it('usa el mismo regreso para Atrás Android, delega fuera de Perfil y limpia el listener', () => {
    previous = '/main/catalog';
    const f = TestBed.createComponent(HostComponent);f.detectChanges();
    const next = vi.fn();hardwareBack(next);
    expect(nav.navigateBack).toHaveBeenCalledWith('/main/catalog', {replaceUrl: true});
    expect(next).not.toHaveBeenCalled();
    router.url = '/profile/security';hardwareBack(next);expect(next).toHaveBeenCalledOnce();
    f.destroy();expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it('evita dos navegaciones mientras el regreso está pendiente', () => {
    nav.navigateBack.mockReturnValue(new Promise(() => undefined));
    const f = TestBed.createComponent(HostComponent);f.detectChanges();
    f.nativeElement.querySelector('button').click();f.nativeElement.querySelector('button').click();
    expect(nav.navigateBack).toHaveBeenCalledOnce();f.destroy();
  });
});
