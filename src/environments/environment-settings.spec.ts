import { developmentEnvironment, PRODUCTION_API_BASE_URL, stagingEnvironment } from './environment-settings';
import { environment as production } from './environment.prod';
import { environment as demo } from './environment.demo';

describe('explicit build environments', () => {
  it('preserves browser and emulator local backends', () => {
    expect(developmentEnvironment('web').apiBaseUrl).toBe('http://localhost:8080');
    expect(developmentEnvironment('android').apiBaseUrl).toBe('http://10.0.2.2:8080');
  });
  it('supports explicit USB device configuration and restricts cleartext', () => {
    expect(developmentEnvironment('android', 'http://localhost:8080').apiBaseUrl).toBe('http://localhost:8080');
    expect(() => developmentEnvironment('android', 'http://private-host.test:8080')).toThrow();
    expect(() => developmentEnvironment('android', PRODUCTION_API_BASE_URL)).toThrow();
  });
  it('selects the production HTTPS origin', () => {
    expect(production).toMatchObject({ name: 'production', production: true, publicCatalogEnabled: true, apiBaseUrl: PRODUCTION_API_BASE_URL });
  });
  it('keeps DEMO explicit and isolated from production', () => {
    expect(demo).toMatchObject({ name: 'demo', publicCatalogEnabled: false, apiBaseUrl: 'https://demo.invalid' });
    expect(demo.apiBaseUrl).not.toBe(production.apiBaseUrl);
  });
  it('accepts explicitly configured HTTPS staging', () => {
    expect(stagingEnvironment('https://isolated.example.test').name).toBe('staging');
  });
  it.each(['', PRODUCTION_API_BASE_URL, `${PRODUCTION_API_BASE_URL}/api`, 'http://isolated.example.test', 'https://user:secret@isolated.example.test', 'https://isolated.example.test/?key=value'])('rejects unsafe staging configuration %s', value => {
    expect(() => stagingEnvironment(value)).toThrow();
  });
});
