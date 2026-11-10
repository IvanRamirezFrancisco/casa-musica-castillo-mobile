import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, firstValueFrom, of, throwError } from 'rxjs';
import { ApiError } from '../api/api-error';
import { CHALLENGE, testSession } from '../api/auth.testing';
import { SessionStorageError } from '../infrastructure/native-session.store';
import { MemorySessionStore } from '../infrastructure/memory-session.store';
import type { SessionStore } from '../models/auth.model';
import { AUTH_REPOSITORY, AuthRepository } from '../repositories/auth.repository';
import { SESSION_STORE } from '../security/session-store.token';
import { AuthService } from './auth.service';

function setup(store: SessionStore = new MemorySessionStore()) {
  const repo = {
    login: vi.fn(), sendTwoFactorEmailCode: vi.fn(), verifyTwoFactor: vi.fn(), register: vi.fn(),
    resendVerification: vi.fn(), verifyEmail: vi.fn(), requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(), logout: vi.fn(), restoreUser: vi.fn().mockReturnValue(of(testSession().user)),
  } satisfies Record<keyof AuthRepository, ReturnType<typeof vi.fn>>;
  TestBed.configureTestingModule({ providers: [
    provideRouter([]), { provide: AUTH_REPOSITORY, useValue: repo }, { provide: SESSION_STORE, useValue: store },
  ] });
  return { repo, service: TestBed.inject(AuthService), router: TestBed.inject(Router), store };
}

describe('AuthService', () => {
  afterEach(() => vi.useRealTimers());

  it('login con 2FA no crea sesión: solo expone el desafío', () => {
    const { repo, service } = setup();
    const challenge = { preAuthChallenge: CHALLENGE, methods: ['EMAIL' as const] };
    repo.login.mockReturnValue(of({ kind: 'two-factor', challenge }));
    const next = vi.fn();
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe(next);
    expect(next).toHaveBeenCalledWith({ kind: 'two-factor', challenge });
    expect(service.user()).toBeNull();
    expect(service.hasValidSession()).toBe(false);
    expect(service.validToken()).toBeNull();
  });

  it('login exitoso guarda la sesión, entrega solo el usuario y marca almacén volátil', async () => {
    const { repo, service, store } = setup();
    const session = testSession();
    repo.login.mockReturnValue(of({ kind: 'authenticated', session }));
    const next = vi.fn();
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe(next);
    expect(next.mock.calls[0][0]).toEqual({ kind: 'authenticated', user: session.user });
    expect(JSON.stringify(next.mock.calls[0][0])).not.toContain(session.token);
    expect(service.user()?.id).toBe(7);
    expect(service.validToken()).toBe(session.token);
    expect(service.persistent).toBe(false);
    await expect(store.load()).resolves.toEqual(session);
  });

  it('un error de login no modifica el estado', () => {
    const { repo, service } = setup();
    repo.login.mockReturnValue(throwError(() => new ApiError('http', 401)));
    const error = vi.fn();
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe({ error });
    expect(error).toHaveBeenCalled();
    expect(service.user()).toBeNull();
  });

  it('completar 2FA establece la sesión', () => {
    const { repo, service } = setup();
    repo.verifyTwoFactor.mockReturnValue(of(testSession()));
    const next = vi.fn();
    service.completeTwoFactor({ preAuthChallenge: CHALLENGE, method: 'EMAIL', code: '123456' }).subscribe(next);
    expect(next.mock.calls[0][0].id).toBe(7);
    expect(service.hasValidSession()).toBe(true);
  });

  it('delegan en el repositorio registro, reenvío, verificación y recuperación', () => {
    const { repo, service } = setup();
    for (const name of ['register', 'resendVerification', 'verifyEmail', 'requestPasswordReset', 'confirmPasswordReset', 'sendTwoFactorEmailCode'] as const) {
      repo[name].mockReturnValue(of(undefined));
    }
    const done = vi.fn();
    service.register({ username: 'ana', firstName: 'A', lastName: 'B', email: 'a@gmail.com', password: 'x' }).subscribe(done);
    service.resendVerification('a@gmail.com').subscribe(done);
    service.verifyEmail('t').subscribe(done);
    service.requestPasswordReset('a@gmail.com').subscribe(done);
    service.confirmPasswordReset('t', 'p').subscribe(done);
    service.sendTwoFactorEmailCode({ preAuthChallenge: CHALLENGE, methods: ['EMAIL'] }).subscribe(done);
    expect(done).toHaveBeenCalledTimes(6);
  });

  it('una sesión vencida o a punto de vencer no entrega token', () => {
    const { repo, service } = setup();
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession({ expiresAt: Date.now() + 2_000 }) }));
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe();
    expect(service.validToken()).toBeNull();
    expect(service.hasValidSession(Date.now() - 60_000)).toBe(true);
  });

  it('un token sin exp no concede una sesión indefinida', () => {
    const { repo, service } = setup();
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession({ expiresAt: null }) }));
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe();
    expect(service.hasValidSession(Date.now() + 10 * 365 * 24 * 3_600_000)).toBe(false);
  });

  it('logout revoca en servidor y limpia siempre', async () => {
    const { repo, service, store } = setup();
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    repo.logout.mockReturnValue(of(undefined));
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe();
    const ended = vi.fn(); service.sessionEnded$.subscribe(ended);
    const next = vi.fn();
    service.logout().subscribe(next);
    expect(next).toHaveBeenCalledWith({ remoteRevoked: true });
    expect(service.user()).toBeNull();
    expect(service.sessionExpired()).toBe(false);
    expect(ended).toHaveBeenCalled();
    await expect(store.load()).resolves.toBeNull();
  });

  it('logout limpia localmente aunque el servidor falle y lo informa', () => {
    const { repo, service } = setup();
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    repo.logout.mockReturnValue(throwError(() => new ApiError('connection', 0)));
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe();
    const next = vi.fn();
    service.logout().subscribe(next);
    expect(next).toHaveBeenCalledWith({ remoteRevoked: false });
    expect(service.user()).toBeNull();
  });

  it('logout sin sesión no llama al servidor', () => {
    const { repo, service } = setup();
    const next = vi.fn();
    service.logout().subscribe(next);
    expect(repo.logout).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith({ remoteRevoked: false });
  });

  it('un 401 limpia credenciales, avisa expiración y navega a login una sola vez', async () => {
    const { repo, service, router } = setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe();
    service.handleUnauthorized();
    service.handleUnauthorized();
    expect(service.user()).toBeNull();
    expect(service.sessionExpired()).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    service.acknowledgeExpiry();
    expect(service.sessionExpired()).toBe(false);
  });

  it('no navega a login si ya está en login o si se solicita sin navegación', async () => {
    const { service, router } = setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    service.handleUnauthorized(false);
    expect(navigate).not.toHaveBeenCalled();
    Object.defineProperty(router, 'url', { value: '/login?returnUrl=%2Fmain', configurable: true });
    service.acknowledgeExpiry();
    service.handleUnauthorized();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cambiar de usuario descarta el estado del anterior', () => {
    const { repo, service } = setup();
    const ended = vi.fn(); service.sessionEnded$.subscribe(ended);
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe();
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe();
    expect(ended).not.toHaveBeenCalled();
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession({ user: { ...testSession().user, id: 99 } }) }));
    service.login({ email: 'b@gmail.com', password: 'x' }).subscribe();
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('restore carga la sesión vigente una sola vez y descarta una vencida', async () => {
    const stored: SessionStore = { persistent: true, save: vi.fn(), load: vi.fn().mockResolvedValue(testSession()), clear: vi.fn() };
    const { service } = setup(stored);
    await Promise.all([service.restore(), service.restore()]);
    expect(stored.load).toHaveBeenCalledTimes(1);
    expect(service.hasValidSession()).toBe(true);
    expect(service.persistent).toBe(true);

    TestBed.resetTestingModule();
    const expired: SessionStore = { persistent: true, save: vi.fn(), load: vi.fn().mockResolvedValue(testSession({ expiresAt: Date.now() - 1_000 })), clear: vi.fn().mockResolvedValue(undefined) };
    const second = setup(expired).service;
    await second.restore();
    expect(second.hasValidSession()).toBe(false);
    expect(second.sessionExpired()).toBe(true);
    expect(expired.clear).toHaveBeenCalled();
  });

  it('restore tolera un almacén que falla y fallos al guardar o limpiar', async () => {
    const broken: SessionStore = {
      persistent: true, save: vi.fn().mockRejectedValue(new Error('keystore')),
      load: vi.fn().mockRejectedValue(new Error('keystore')), clear: vi.fn().mockRejectedValue(new Error('keystore')),
    };
    const { repo, service } = setup(broken);
    await service.restore();
    expect(service.user()).toBeNull();
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    const error = vi.fn();
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe({ error });
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    expect(service.hasValidSession()).toBe(false);
    expect(service.storageFailure()).toBe(true);
    service.handleUnauthorized(false);
    expect(service.user()).toBeNull();
  });
  it('restauración persistente consulta /me y utiliza roles actuales del servidor', async () => {
    const session = testSession();
    const stored: SessionStore = { persistent: true, save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(session), clear: vi.fn().mockResolvedValue(undefined) };
    const { repo, service } = setup(stored);
    const serverUser = { ...session.user, roles: ['ROLE_CUSTOMER'] };
    repo.restoreUser.mockReturnValue(of(serverUser));
    await service.restore();
    expect(repo.restoreUser).toHaveBeenCalledWith(session.token);
    expect(service.user()).toEqual(serverUser);
  });

  it.each([401, 403])('no concede una sesión restaurada si Spring rechaza /me (%i)', async (status) => {
    const stored: SessionStore = { persistent: true, save: vi.fn(),
      load: vi.fn().mockResolvedValue(testSession()), clear: vi.fn().mockResolvedValue(undefined) };
    const { repo, service } = setup(stored);
    repo.restoreUser.mockReturnValue(throwError(() => new ApiError('http', status)));
    await service.restore();
    expect(service.user()).toBeNull();
    expect(service.validToken()).toBeNull();
    expect(stored.clear).toHaveBeenCalled();
  });

  it.each([0, 429, 503])('retiene el estado cifrado sin conceder sesión y revalida /me tras un fallo temporal (%i)', async (status) => {
    const session = testSession();
    const stored: SessionStore = { persistent: true, save: vi.fn(),
      load: vi.fn().mockResolvedValue(session), clear: vi.fn().mockResolvedValue(undefined) };
    const { repo, service } = setup(stored);
    repo.restoreUser.mockReturnValueOnce(throwError(() => new ApiError('http', status)));
    await service.restore();
    expect(service.user()).toBeNull();
    expect(service.validToken()).toBeNull();
    expect(stored.clear).not.toHaveBeenCalled();
    await Promise.all([service.restore(), service.restore()]);
    expect(repo.restoreUser).toHaveBeenCalledTimes(2);
    expect(service.user()).toEqual(session.user);
  });

  it('rechaza una identidad distinta al revalidar /me', async () => {
    const stored: SessionStore = { persistent: true, save: vi.fn(),
      load: vi.fn().mockResolvedValue(testSession()), clear: vi.fn().mockResolvedValue(undefined) };
    const { repo, service } = setup(stored);
    repo.restoreUser.mockReturnValue(of({ ...testSession().user, id: 99 }));
    await service.restore();
    expect(service.user()).toBeNull();
    expect(service.storageFailure()).toBe(true);
    expect(stored.clear).toHaveBeenCalled();
  });

  it('espera al cifrado antes de comunicar login exitoso', async () => {
    let release!: () => void;
    const stored: SessionStore = { persistent: true, save: vi.fn().mockImplementation(() => new Promise<void>(resolve => { release = resolve; })),
      load: vi.fn().mockResolvedValue(null), clear: vi.fn().mockResolvedValue(undefined) };
    const { repo, service } = setup(stored);
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    const next = vi.fn(); service.login({ email: 'a@gmail.com', password: 'x' }).subscribe(next);
    expect(next).not.toHaveBeenCalled(); expect(service.user()).toBeNull();
    release(); await vi.waitFor(() => expect(next).toHaveBeenCalled());
    expect(service.hasValidSession()).toBe(true);
  });

  it('MFA no escribe credenciales hasta verificar el segundo factor y completar el cifrado', async () => {
    const stored: SessionStore = { persistent: true, save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(null), clear: vi.fn().mockResolvedValue(undefined) };
    const { repo, service } = setup(stored);
    repo.login.mockReturnValue(of({ kind: 'two-factor', challenge: { preAuthChallenge: CHALLENGE, methods: ['EMAIL'] } }));
    await firstValueFrom(service.login({ email: 'a@gmail.com', password: 'x' }));
    expect(stored.save).not.toHaveBeenCalled();
    repo.verifyTwoFactor.mockReturnValue(of(testSession()));
    await firstValueFrom(service.completeTwoFactor({ preAuthChallenge: CHALLENGE, method: 'EMAIL', code: '123456' }));
    expect(stored.save).toHaveBeenCalledTimes(1);
    expect(service.hasValidSession()).toBe(true);
  });

  it('logout impide que una restauración lenta recupere la sesión cerrada', async () => {
    let release!: (value: ReturnType<typeof testSession>) => void;
    const stored: SessionStore = { persistent: true, save: vi.fn(),
      load: vi.fn().mockImplementation(() => new Promise(resolve => { release = resolve; })), clear: vi.fn().mockResolvedValue(undefined) };
    const { service } = setup(stored);
    const restoration = service.restore();
    service.logout().subscribe(); release(testSession()); await restoration;
    expect(service.user()).toBeNull();
  });

  it('una respuesta lenta de /me no sustituye una sesión posterior', async () => {
    const stored: SessionStore = { persistent: true, save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(testSession()), clear: vi.fn().mockResolvedValue(undefined) };
    const { repo, service } = setup(stored);
    const pending = new Subject<ReturnType<typeof testSession>['user']>(); repo.restoreUser.mockReturnValue(pending);
    const restoration = service.restore(); await Promise.resolve();
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession({ user: { ...testSession().user, id: 99 } }) }));
    await firstValueFrom(service.login({ email: 'b@gmail.com', password: 'x' }));
    pending.next(testSession().user); pending.complete(); await restoration;
    expect(service.user()?.id).toBe(99);
  });

  it('un login tardío no vuelve a autenticar después de logout', () => {
    const { repo, service } = setup();
    const pending = new Subject(); repo.login.mockReturnValue(pending);
    const error = vi.fn(); service.login({ email: 'a@gmail.com', password: 'x' }).subscribe({ error });
    service.logout().subscribe(); pending.next({ kind: 'authenticated', session: testSession() });
    expect(service.user()).toBeNull(); expect(error).toHaveBeenCalled();
  });

  it('un guardado pendiente no vuelve a autenticar después de logout', async () => {
    let release!: () => void;
    const stored: SessionStore = { persistent: true, save: vi.fn().mockImplementation(() => new Promise<void>(resolve => { release = resolve; })),
      load: vi.fn(), clear: vi.fn().mockResolvedValue(undefined) };
    const { repo, service } = setup(stored);
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    const error = vi.fn(); service.login({ email: 'a@gmail.com', password: 'x' }).subscribe({ error });
    service.logout().subscribe(); release(); await vi.waitFor(() => expect(error).toHaveBeenCalled());
    expect(service.user()).toBeNull();
  });

  it('logout elimina el estado local sin esperar una revocación de red pendiente', () => {
    const { repo, service } = setup();
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe();
    const pending = new Subject<void>(); repo.logout.mockReturnValue(pending);
    const next = vi.fn(); service.logout().subscribe(next);
    expect(service.user()).toBeNull(); expect(next).not.toHaveBeenCalled();
    pending.next(); pending.complete();
    expect(next).toHaveBeenCalledWith({ remoteRevoked: true });
  });

  it('la expiración programada limpia el usuario, sus datos y el almacén', async () => {
    vi.useFakeTimers();
    const { repo, service, router, store } = setup();
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession({ expiresAt: Date.now() + 20_000 }) }));
    service.login({ email: 'a@gmail.com', password: 'x' }).subscribe();
    const ended = vi.fn(); service.sessionEnded$.subscribe(ended);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(service.user()).toBeNull(); expect(service.sessionExpired()).toBe(true);
    expect(ended).toHaveBeenCalledOnce(); await expect(store.load()).resolves.toBeNull();
  });

  it('logout persistente espera a confirmar el borrado nativo, sin conservar identidad mientras tanto', async () => {
    let release!: () => void;
    const stored: SessionStore = { persistent: true, save: vi.fn().mockResolvedValue(undefined), load: vi.fn(),
      clear: vi.fn().mockImplementation(() => new Promise<void>(resolve => { release = resolve; })) };
    const { repo, service } = setup(stored);
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    repo.logout.mockReturnValue(of(undefined));
    await firstValueFrom(service.login({ email: 'a@gmail.com', password: 'x' }));
    const next = vi.fn(); service.logout().subscribe(next);
    expect(service.user()).toBeNull(); expect(next).not.toHaveBeenCalled();
    release(); await vi.waitFor(() => expect(next).toHaveBeenCalledWith({ remoteRevoked: true }));
  });

  it('un borrado nativo fallido se informa; nunca se afirma que las credenciales se borraron', async () => {
    const stored: SessionStore = { persistent: true, save: vi.fn().mockResolvedValue(undefined), load: vi.fn(),
      clear: vi.fn().mockRejectedValue(new Error('private-os-details')) };
    const { repo, service } = setup(stored);
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    repo.logout.mockReturnValue(throwError(() => new ApiError('connection', 0)));
    await firstValueFrom(service.login({ email: 'a@gmail.com', password: 'x' }));
    await expect(firstValueFrom(service.logout())).resolves.toEqual({ remoteRevoked: false });
    expect(service.user()).toBeNull(); expect(service.storageFailure()).toBe(true);
  });

  it('un fallo al volver a cifrar la misma identidad descarta también sus datos privados en memoria', async () => {
    const stored: SessionStore = { persistent: true, load: vi.fn(), clear: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('keystore')) };
    const { service, repo } = setup(stored);
    repo.login.mockReturnValue(of({ kind: 'authenticated', session: testSession() }));
    await firstValueFrom(service.login({ email: 'a@gmail.com', password: 'x' }));
    const ended = vi.fn(); service.sessionEnded$.subscribe(ended);
    await expect(firstValueFrom(service.login({ email: 'a@gmail.com', password: 'x' }))).rejects.toThrow();
    expect(service.user()).toBeNull(); expect(ended).toHaveBeenCalledOnce();
    expect(service.storageFailure()).toBe(true);
  });

  it('una credencial nativa vencida solicita login sin afirmar un fallo del Keystore', async () => {
    const stored: SessionStore = { persistent: true, save: vi.fn(), clear: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockRejectedValue(new SessionStorageError('expired')) };
    const { service } = setup(stored);
    await service.restore();
    expect(service.user()).toBeNull(); expect(service.sessionExpired()).toBe(true);
    expect(service.storageFailure()).toBe(false); expect(stored.clear).toHaveBeenCalled();
  });

});
