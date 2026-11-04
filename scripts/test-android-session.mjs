// Actual Android app + native plugin; HTTP remains controlled, never PostgreSQL evidence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { startFixture } from '../test/android-session/fixture-server.mjs';
const folder = 'reports/android-session'; fs.mkdirSync(folder, { recursive: true });
const adb = process.env.CMC_TEST_ADB ?? 'adb';
const maestro = process.env.CMC_TEST_MAESTRO ?? 'maestro';
const app = 'com.casademusicacastillo.app';
const run = (cmd, args, capture = false) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' && cmd.endsWith('.bat') });
  const chunks = []; const errors = [];
  child.stdout.on('data', d => { if (capture) chunks.push(d); else process.stdout.write(d); });
  child.stderr.on('data', d => { if (capture) errors.push(d); else process.stderr.write(d); });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${path.basename(cmd)} failed (${code}); private command output withheld.`)));
});
const result = { status: 'FAIL', category: 'D Android real; B HTTP controlado; no PostgreSQL', startedAt: new Date().toISOString(), flows: [], storage: [], logcatContainsCredential: null };
fs.writeFileSync(`${folder}/evidence.json`, JSON.stringify(result, null, 2));
const build = JSON.parse(fs.readFileSync('reports/android-packages/device-debug/build-report.json', 'utf8'));
assert.equal(build.environment, 'device'); assert.equal(build.variant, 'debug');
assert.equal(build.apiBaseUrl, 'http://127.0.0.1:18181');
const artifact = build.packages[0];
assert.equal(createHash('sha256').update(fs.readFileSync(artifact.path)).digest('hex'), artifact.sha256);
result.apk = { sha256: artifact.sha256, sourceSha: build.sourceSha, sourceTreeDirty: build.sourceTreeDirty };
const fixture = await startFixture();
const appLogs = [];
const stop = () => run(adb, ['shell', 'am', 'force-stop', app]);
const inspect = async present => {
  // Only synthetic test credentials. Never export plaintext/session data to reports or Logcat.
  const xml = (await run(adb, ['shell', 'run-as', app, 'cat', 'shared_prefs/WSSecureStorageSharedPreferences.xml'], true)).toString();
  assert.equal(xml.includes('capacitor-storage_cmc.session.v1'), present, 'Encrypted session key presence is incorrect.');
  assert.ok(!xml.includes('example.test') && !xml.includes('accessToken') && !xml.includes('Bearer '), 'Plaintext found in encrypted preferences.');
  for (const token of fixture.state.allTokens) assert.ok(!xml.includes(token), 'JWT leaked in preferences.');
  if (present) assert.match(xml, /&#(?:x10|16);|\u0010/, 'AES-GCM ciphertext/IV separator missing.');
  result.storage.push({ present, plaintext: false, sha256: createHash('sha256').update(xml).digest('hex') });
};
try {
  assert.equal((await run(adb, ['shell', 'getprop', 'ro.kernel.qemu'], true)).toString().trim(), '1', 'Use an isolated emulator; this runner clears app data.');
  const installedPath = (await run(adb, ['shell', 'pm', 'path', app], true)).toString().trim().replace(/^package:/, '');
  assert.match(installedPath, /^\/data\/app\/[A-Za-z0-9_./=+~-]+\/base\.apk$/);
  const installedHash = (await run(adb, ['shell', 'sha256sum', installedPath], true)).toString().split(/\s/)[0];
  assert.equal(installedHash, artifact.sha256, 'Installed APK does not match the isolated test build.');
  await run(adb, ['reverse', 'tcp:18181', 'tcp:18181']);
  await run(adb, ['logcat', '-c']);
  for (const phase of ['login', 'restore-logout', 'mfa', 'revoked']) {
    if (phase === 'revoked') fixture.state.revoked = true;
    await stop();
    const junit = `${folder}/${phase}.xml`;
    await run(maestro, ['test', '--format', 'JUNIT', '--output', junit, '--test-output-dir', `${folder}/${phase}`, '--debug-output', `${folder}/debug-${phase}`, `test/android-session/${phase}.yaml`]);
    const evidence = fs.readFileSync(junit, 'utf8');
    assert.equal((evidence.match(/<testcase\b/g) ?? []).length, 1, 'Phase must execute exactly once.');
    assert.ok(evidence.includes('status="SUCCESS"') && !/<(?:failure|error|skipped)\b/.test(evidence), 'Phase did not pass.');
    const pid = (await run(adb, ['shell', 'pidof', app], true)).toString().trim();
    assert.match(pid, /^[0-9]+$/);
    appLogs.push((await run(adb, ['logcat', '-d', `--pid=${pid}`], true)).toString());
    await inspect(['login', 'mfa'].includes(phase));
    result.flows.push({ phase, status: 'PASS' });
  }
  assert.equal(fixture.state.logins, 2); assert.equal(fixture.state.me, 1);
  assert.equal(fixture.state.logout, 1); assert.equal(fixture.state.mfa, 1); assert.equal(fixture.state.emails, 1);
  const logs = appLogs.join('\n');
  for (const token of fixture.state.allTokens) assert.ok(!logs.includes(token), 'JWT leaked to Logcat.');
  assert.ok(!logs.includes('Only-Local-123'), 'Password leaked to Logcat.');
  result.logcatContainsCredential = false; result.status = 'PASS';
} finally {
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(`${folder}/evidence.json`, JSON.stringify(result, null, 2));
  await fixture.close();
  await run(adb, ['reverse', '--remove', 'tcp:18181']).catch(() => undefined);
}
