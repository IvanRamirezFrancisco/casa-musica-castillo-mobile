import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fs.readFileSync(fileURLToPath(new URL('../src/environments/environment-settings.ts', import.meta.url)), 'utf8');
export const productionApiUrl = source.match(/PRODUCTION_API_BASE_URL = '([^']+)'/)[1];

export function buildOptions({ environment, variant, apiUrl, isolated = false, requireSigning = false }, env = process.env) {
  if (!['development', 'device', 'staging', 'production', 'demo'].includes(environment) || !['debug', 'qa', 'release'].includes(variant)) {
    throw new Error('Choose an explicit environment and debug/qa/release variant.');
  }
  if (variant === 'qa' && environment !== 'production') throw new Error('Connected QA requires the fixed production origin.');
  if (variant === 'release' && !['production', 'staging'].includes(environment)) {
    throw new Error('Release cannot package local or DEMO web assets.');
  }
  if (apiUrl && !['staging', 'device'].includes(environment)) throw new Error('This environment does not accept an endpoint override.');
  const defines = [];
  if (variant === 'qa') defines.push('--define=CMC_CONNECTED_QA=true');
  let endpoint = environment === 'production' ? productionApiUrl : environment === 'demo' ? 'https://demo.invalid' : 'http://10.0.2.2:8080';
  if (['staging', 'device'].includes(environment)) {
    if (!apiUrl) throw new Error('An explicit public API origin is required; no backend is provisioned automatically.');
    const url = new URL(apiUrl);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('API URL must be a public configuration origin, never credentials or parameters.');
    if (environment === 'staging') {
      const productionHost = new URL(productionApiUrl).hostname;
      if (!isolated || url.protocol !== 'https:' || !/\.[a-z][a-z0-9-]*$/i.test(url.hostname)
          || /\.(localhost|local|internal)$/i.test(url.hostname)
          || url.hostname === productionHost || url.hostname.endsWith(`.${productionHost}`)) {
        throw new Error('Staging requires explicit isolation confirmation and HTTPS distinct from production.');
      }
    } else if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname))) {
      throw new Error('Cleartext Debug is restricted to explicit loopback/emulator hosts.');
    }
    if (environment === 'device' && url.hostname === new URL(productionApiUrl).hostname) {
      throw new Error('Device development builds cannot target the commercial production backend.');
    }
    endpoint = url.origin;
    defines.push(`--define=${environment === 'staging' ? 'CMC_STAGING_API_URL' : 'CMC_DEVICE_API_URL'}=${JSON.stringify(endpoint)}`);
  }
  const signingNames = ['CMC_UPLOAD_STORE_FILE', 'CMC_UPLOAD_STORE_PASSWORD', 'CMC_UPLOAD_KEY_ALIAS', 'CMC_UPLOAD_KEY_PASSWORD'];
  const supplied = signingNames.filter(name => Boolean(env[name]));
  if (supplied.length && supplied.length !== signingNames.length) throw new Error('Private upload signing configuration is incomplete.');
  if (requireSigning && (variant !== 'release' || supplied.length !== signingNames.length)) throw new Error('Upload signing is available only for Release with an authorized identity.');
  const publicDemo = environment === 'production' && variant === 'debug';
  const angularConfiguration = publicDemo ? 'production,public-demo' : environment === 'device' ? 'development' : environment;
  const nativeVariant = publicDemo ? 'publicDemo' : variant === 'qa' ? 'connectedQa'
    : environment === 'staging' && variant === 'debug' ? 'stagingConnected' : variant;
  return { environment, variant, nativeVariant, angularConfiguration, publicDemo,
    apiBaseUrl: endpoint, isolated: environment === 'staging' && isolated, defines,
    signing: variant !== 'release' ? 'android-debug-key' : supplied.length ? 'external-upload-key' : 'unsigned' };
}
