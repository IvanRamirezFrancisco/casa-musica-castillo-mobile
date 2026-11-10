import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildOptions, productionApiUrl } from '../scripts/android-build-config.mjs';

test('Release rejects every local/DEMO environment and missing/partial upload identity', () => {
  for (const environment of ['development', 'device', 'demo']) assert.throws(() => buildOptions({ environment, variant: 'release' }, {}));
  assert.throws(() => buildOptions({ environment: 'production', variant: 'release', requireSigning: true }, {}));
  assert.throws(() => buildOptions({ environment: 'production', variant: 'release' }, { CMC_UPLOAD_KEY_ALIAS: 'test-fixture' }));
  assert.equal(buildOptions({ environment: 'production', variant: 'release' }, {}).signing, 'unsigned');
});
test('production is fixed centrally and cannot be overridden by a caller', () => {
  assert.equal(buildOptions({ environment: 'production', variant: 'release' }, {}).apiBaseUrl, productionApiUrl);
  assert.throws(() => buildOptions({ environment: 'production', variant: 'release', apiUrl: 'https://other.example.test' }, {}));
  const debug = buildOptions({ environment: 'production', variant: 'debug' }, {});
  assert.equal(debug.apiBaseUrl, productionApiUrl);
  assert.equal(debug.angularConfiguration, 'production,public-demo');
  assert.equal(debug.publicDemo, true);
  assert.equal(buildOptions({ environment: 'production', variant: 'release' }, {}).publicDemo, false);
});
test('staging requires an explicitly isolated HTTPS origin, distinct from production', () => {
  for (const apiUrl of [undefined, productionApiUrl, 'http://isolated.example.test', 'https://user:password@isolated.example.test', 'https://isolated.example.test/?token=fixture',
    'https://localhost', 'https://test.localhost', 'https://postgres.internal', 'https://192.168.1.2', 'https://[::1]']) {
    assert.throws(() => buildOptions({ environment: 'staging', variant: 'release', isolated: true, apiUrl }, {}));
  }
  assert.throws(() => buildOptions({ environment: 'staging', variant: 'debug', apiUrl: 'https://isolated.example.test' }, {}));
  const options = buildOptions({ environment: 'staging', variant: 'release', isolated: true, apiUrl: 'https://isolated.example.test' }, {});
  assert.equal(options.apiBaseUrl, 'https://isolated.example.test');
  assert.equal(options.isolated, true);
});
test('device builds cannot silently use the emulator; HTTP is limited to explicit local hosts', () => {
  assert.throws(() => buildOptions({ environment: 'device', variant: 'debug' }, {}));
  assert.throws(() => buildOptions({ environment: 'device', variant: 'debug', apiUrl: 'http://lan.example.test:8080' }, {}));
  assert.throws(() => buildOptions({ environment: 'device', variant: 'debug', apiUrl: productionApiUrl }, {}));
  assert.equal(buildOptions({ environment: 'device', variant: 'debug', apiUrl: 'http://localhost:8080' }, {}).apiBaseUrl, 'http://localhost:8080');
});
test('Angular replacements preserve production, DEMO and explicit staging; budgets stay intact', () => {
  const angular = JSON.parse(fs.readFileSync(new URL('../angular.json', import.meta.url)));
  const build = angular.projects.app.architect.build;
  for (const [name, file] of [['production', 'environment.prod.ts'], ['demo', 'environment.demo.ts'], ['staging', 'environment.staging.ts']]) {
    assert.deepEqual(build.configurations[name].fileReplacements, [{ replace: 'src/environments/environment.ts', with: `src/environments/${file}` }]);
  }
  assert.equal(build.configurations.production.sourceMap, false);
  assert.deepEqual(build.configurations['public-demo'].fileReplacements.map(item => item.with), [
    'src/environments/environment.public-demo.ts', 'src/app/app.routes.public-demo.ts',
  ]);
  assert.equal(build.configurations.production.budgets[1].maximumError, '4kb');
  assert.equal(angular.projects.app.architect.test.configurations.ci.coverageThresholds.lines, 60);
});
