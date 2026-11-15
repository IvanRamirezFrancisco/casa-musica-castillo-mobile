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
  assert.equal(debug.nativeVariant, 'publicDemo');
  assert.equal(buildOptions({ environment: 'production', variant: 'release' }, {}).publicDemo, false);
});
test('reviewed commerce is opt-in and restricted to explicitly signed Production Release', () => {
  const env = Object.fromEntries(['STORE_FILE', 'STORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD']
    .map(name => [`CMC_UPLOAD_${name}`, 'test-fixture']));
  const release = { environment: 'production', variant: 'release', requireSigning: true };
  assert.equal(buildOptions(release, env).enableReviewedCommerce, false);
  assert.throws(() => buildOptions({ ...release, requireSigning: false, enableReviewedCommerce: true }, env));
  assert.throws(() => buildOptions({ ...release, enableReviewedCommerce: true }, {}));
  const enabled = buildOptions({ ...release, enableReviewedCommerce: true }, env);
  assert.equal(enabled.enableReviewedCommerce, true);
  assert.deepEqual(enabled.defines, ['--define=CMC_REVIEWED_COMMERCE=true']);
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
  const debug = buildOptions({ environment: 'staging', variant: 'debug', isolated: true, apiUrl: 'https://isolated.example.test' }, {});
  assert.equal(debug.nativeVariant, 'stagingConnected');
  assert.equal(debug.angularConfiguration, 'staging');
  assert.equal(debug.publicDemo, false);
});
test('LAN acceptance only enables authenticated staging at an isolated private HTTPS origin', () => {
  const args = { environment: 'staging', variant: 'lan', isolated: true, apiUrl: 'https://192.168.1.107:18443' };
  const config = buildOptions(args, {});
  assert.equal(config.nativeVariant, 'stagingLan');
  assert.equal(config.angularConfiguration, 'staging');
  assert.equal(config.signing, 'android-debug-key');
  assert.equal(config.publicDemo, false);
  assert.ok(config.defines.includes('--define=CMC_LAN_INTEGRATION=true'));
  for (const apiUrl of ['http://192.168.1.107', 'https://8.8.8.8', 'https://127.0.0.1', productionApiUrl]) {
    assert.throws(() => buildOptions({ ...args, apiUrl }, {}));
  }
  for (const override of [{ isolated: false }, { environment: 'production' }, { variant: 'release' }]) {
    assert.throws(() => buildOptions({ ...args, ...override }, {}));
  }
});

test('Connected QA uses Production routes and a Debug identity without changing publicDemo', () => {
  const qa = buildOptions({ environment: 'production', variant: 'qa' }, {});
  assert.equal(qa.apiBaseUrl, productionApiUrl);
  assert.equal(qa.angularConfiguration, 'production');
  assert.equal(qa.nativeVariant, 'connectedQa');
  assert.equal(qa.publicDemo, false);
  assert.equal(qa.signing, 'android-debug-key');
  assert.deepEqual(qa.defines, ['--define=CMC_CONNECTED_QA=true']);
  assert.throws(() => buildOptions({ environment: 'staging', variant: 'qa' }, {}));
  assert.throws(() => buildOptions({ environment: 'production', variant: 'qa', requireSigning: true }, {}));
});
test('emulator integration is an isolated Debug variant with a fixed origin', () => {
  const config = buildOptions({ environment: 'staging', variant: 'emulator', isolated: true }, {});
  assert.equal(config.apiBaseUrl, 'http://10.0.2.2:18082');
  assert.equal(config.nativeVariant, 'emulatorIntegration');
  assert.equal(config.angularConfiguration, 'staging');
  assert.equal(config.signing, 'android-debug-key');
  assert.equal(config.publicDemo, false);
  for (const options of [
    { environment: 'production', variant: 'emulator', isolated: true },
    { environment: 'staging', variant: 'emulator' },
    { environment: 'staging', variant: 'emulator', isolated: true, apiUrl: productionApiUrl },
    { environment: 'staging', variant: 'release', isolated: true, apiUrl: config.apiBaseUrl },
  ]) assert.throws(() => buildOptions(options, {}));
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
    assert.deepEqual(build.configurations[name].fileReplacements[0], { replace: 'src/environments/environment.ts', with: `src/environments/${file}` });
  }
  for (const name of ['production', 'staging']) {
    assert.deepEqual(build.configurations[name].fileReplacements.slice(1), [
      { replace: 'src/app/app-page-loaders.ts', with: 'src/app/app-page-loaders.connected.ts' },
      { replace: 'src/app/layout/main-navigation/cart-count.ts', with: 'src/app/layout/main-navigation/cart-count.connected.ts' },
    ]);
  }
  assert.equal(build.configurations.production.sourceMap, false);
  assert.deepEqual(build.configurations['public-demo'].fileReplacements.map(item => item.with), [
    'src/environments/environment.public-demo.ts', 'src/app/app.routes.public-demo.ts',
  ]);
  assert.equal(build.configurations.production.budgets[1].maximumError, '4kb');
  assert.equal(angular.projects.app.architect.test.configurations.ci.coverageThresholds.lines, 60);
});
