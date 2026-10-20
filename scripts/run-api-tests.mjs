import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// No login to Postman, cloud collection, persisted credentials or response-body artifacts.
const base = process.env.API_BASE_URL;
const allowed = process.env.API_AUTHORIZED_ORIGIN;
if (!base || !allowed || process.env.API_TEST_AUTHORIZED !== 'true') {
  throw new Error('BLOCKED: configure API_BASE_URL, API_AUTHORIZED_ORIGIN and API_TEST_AUTHORIZED=true for an authorized non-production environment.');
}
const url = new URL(base);
if (url.origin !== allowed || url.username || url.password || url.search || url.hash ||
  !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
  throw new Error('Invalid or unauthorized API origin; HTTPS required outside loopback.');
}
const suite = process.env.API_TEST_SUITE || 'PUBLIC_CONTRACT';
if (!['PUBLIC_CONTRACT', 'AUTHENTICATED_CONTRACT', 'LOGIN_CONTRACT'].includes(suite)) throw new Error('Unknown API_TEST_SUITE');
const values = { baseUrl: base.replace(/\/$/, ''), missingProductId: process.env.API_MISSING_PRODUCT_ID || '9223372036854775807' };
if (suite === 'AUTHENTICATED_CONTRACT') {
  if (!process.env.API_USER_TOKEN || !process.env.API_USER_ID) throw new Error('BLOCKED: API_USER_TOKEN (ROLE_USER) and API_USER_ID required.');
  Object.assign(values, { userToken: process.env.API_USER_TOKEN, userId: process.env.API_USER_ID });
}
if (suite === 'LOGIN_CONTRACT') {
  if (!process.env.API_TEST_EMAIL || !process.env.API_TEST_PASSWORD) throw new Error('BLOCKED: dedicated test account required.');
  Object.assign(values, { email: process.env.API_TEST_EMAIL, password: process.env.API_TEST_PASSWORD });
}
const directory = mkdtempSync(join(tmpdir(), 'cmc-postman-'));
try {
  const environment = join(directory, 'environment.json');
  writeFileSync(environment, JSON.stringify({ name: 'ephemeral', values: Object.entries(values).map(([key, value]) => ({ key, value, enabled: true })) }), { mode: 0o600 });
  mkdirSync('reports', { recursive: true });
  const run = spawnSync('postman', ['collection', 'run', 'tests/api/mobile.postman_collection.json',
    '-e', environment, '-i', suite, '--no-report-events', '--ignore-redirects', '--timeout-request', '10000',
    '--reporters', 'cli,junit', '--reporter-junit-export', `reports/api-${suite}.xml`], { stdio: 'inherit' });
  if (run.error) throw run.error;
  process.exitCode = run.status ?? 1;
} finally { rmSync(directory, { recursive: true, force: true }); }
