export const PRODUCTION_API_BASE_URL = 'https://casa-musica-castillo-backend.onrender.com';

export interface AppEnvironment {
  readonly name: 'development' | 'staging' | 'production' | 'demo';
  readonly production: boolean;
  readonly publicCatalogEnabled: boolean;
  readonly publicDemo?: boolean;
  readonly apiBaseUrl: string;
}

function origin(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('API configuration must be an origin without credentials, path, query or fragment.');
  }
  return url.origin;
}

/** Public build settings only; credentials never belong in an Angular environment. */
export function developmentEnvironment(platform: string, deviceApiUrl?: string): AppEnvironment {
  const apiBaseUrl = deviceApiUrl || (platform === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080');
  const url = new URL(apiBaseUrl);
  if (deviceApiUrl && url.hostname === new URL(PRODUCTION_API_BASE_URL).hostname) {
    throw new Error('Device development builds must not target the commercial production backend.');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname))) {
    throw new Error('Development HTTP is restricted to loopback/emulator. Use an authorized HTTPS test host for other devices.');
  }
  return { name: 'development', production: false, publicCatalogEnabled: true, apiBaseUrl: origin(apiBaseUrl) };
}

export function stagingEnvironment(apiBaseUrl: string): AppEnvironment {
  const normalized = origin(apiBaseUrl);
  const url = new URL(normalized);
  const productionHost = new URL(PRODUCTION_API_BASE_URL).hostname;
  if (url.protocol !== 'https:' || !/\.[a-z][a-z0-9-]*$/i.test(url.hostname)
      || /\.(localhost|local|internal)$/i.test(url.hostname)
      || url.hostname === productionHost || url.hostname.endsWith(`.${productionHost}`)) {
    throw new Error('Staging requires an isolated HTTPS backend, distinct from production.');
  }
  return { name: 'staging', production: true, publicCatalogEnabled: true, apiBaseUrl: normalized };
}
