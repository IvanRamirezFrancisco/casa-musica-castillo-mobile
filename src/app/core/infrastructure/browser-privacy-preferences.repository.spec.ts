import { TestBed } from '@angular/core/testing';
import { BrowserPrivacyPreferencesRepository, PRIVACY_PREFERENCE_KEY, PRIVACY_PREFERENCE_STORAGE } from './browser-privacy-preferences.repository';
import { PrivacyPreferencesService } from '../services/privacy-preferences.service';

describe('persistencia local mínima de presentación', () => {
  let values: Map<string, string>;
  let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    values = new Map();
    storage = { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => values.set(key, value)) };
    TestBed.configureTestingModule({ providers: [{ provide: PRIVACY_PREFERENCE_STORAGE, useValue: storage }] });
  });
  it('no preselecciona la preferencia y no crea un registro de consentimiento', () => {
    expect(TestBed.inject(PrivacyPreferencesService).hideContact()).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('guarda solo versión/booleano y permite retirar la elección', () => {
    const service = TestBed.inject(PrivacyPreferencesService);
    service.setHideContact(true);
    expect(service.hideContact()).toBe(true);
    expect(JSON.parse(values.get(PRIVACY_PREFERENCE_KEY)!)).toEqual({ version: 1, hideContact: true });
    service.setHideContact(false);
    expect(JSON.parse(values.get(PRIVACY_PREFERENCE_KEY)!)).toEqual({ version: 1, hideContact: false });
    expect(service.message()).toContain('guardada en este dispositivo');
  });
  it('restaura la elección tras recrear el servicio y su inyector', () => {
    TestBed.inject(PrivacyPreferencesService).setHideContact(true);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PRIVACY_PREFERENCE_STORAGE, useValue: storage }] });
    expect(TestBed.inject(PrivacyPreferencesService).hideContact()).toBe(true);
  });
  it.each(['{', 'null', '[]', '{}', '{"version":2,"hideContact":true}', '{"version":1,"hideContact":"true"}', '{"version":1,"hideContact":true,"email":"fixture@example.test"}'])('rechaza datos corruptos o campos ajenos: %s', raw => {
    values.set(PRIVACY_PREFERENCE_KEY, raw);
    const service = TestBed.inject(PrivacyPreferencesService);
    expect(service.hideContact()).toBe(false);
    expect(service.storageError()).toBe(true);
    expect(service.message()).not.toContain('fixture@example.test');
  });
  it('no anuncia persistencia ni cambia la opción si se deniega la escritura', () => {
    const service = TestBed.inject(PrivacyPreferencesService);
    storage.setItem.mockImplementation(() => { throw new Error('private implementation detail'); });
    service.setHideContact(true);
    expect(service.hideContact()).toBe(false);
    expect(service.storageError()).toBe(true);
    expect(service.message()).not.toContain('private implementation detail');
  });
  it('detecta un almacenamiento que ignora escrituras', () => {
    const service = TestBed.inject(PrivacyPreferencesService);
    storage.setItem.mockImplementation(() => undefined);
    service.setHideContact(true);
    expect(service.storageError()).toBe(true);
    expect(service.hideContact()).toBe(false);
  });
  it('permite recuperar acceso al almacenamiento después de un fallo de lectura', () => {
    storage.getItem.mockImplementationOnce(() => { throw new Error('blocked'); });
    const service = TestBed.inject(PrivacyPreferencesService);
    expect(service.storageError()).toBe(true);
    values.set(PRIVACY_PREFERENCE_KEY, '{"version":1,"hideContact":true}');
    service.reload();
    expect(service.hideContact()).toBe(true);
    expect(service.storageError()).toBe(false);
    expect(service.message()).toBe('');
  });
  it('rechaza valores no booleanos sin escribirlos', () => {
    expect(() => TestBed.inject(BrowserPrivacyPreferencesRepository).saveHideContact('yes' as unknown as boolean)).toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
