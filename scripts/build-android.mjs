import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildOptions } from './android-build-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const value = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
const allowed = new Set(['--environment', '--variant', '--api-url', '--isolated', '--require-signing']);
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw new Error('Unknown Android build option.');
  if (['--environment', '--variant', '--api-url'].includes(args[i])) i++;
}
const config = buildOptions({ environment: value('--environment'), variant: value('--variant'), apiUrl: value('--api-url'),
  isolated: args.includes('--isolated'), requireSigning: args.includes('--require-signing') });
const run = (command, parameters, cwd = root) => {
  const result = spawnSync(command, parameters, { cwd, stdio: 'inherit', env: { ...process.env, NG_CLI_ANALYTICS: 'false' } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'build', `--configuration=${config.angularConfiguration}`, ...config.defines]);
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
const www = path.join(root, 'www');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const marker = { environment: config.environment, variant: config.variant, nativeVariant: config.nativeVariant, angularConfiguration: config.angularConfiguration,
  apiBaseUrl: config.apiBaseUrl, isolated: config.isolated, publicDemo: config.publicDemo, sourceSha,
  sourceTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim()),
  webFiles: Object.fromEntries(files(www).filter(f => path.basename(f) !== 'cmc-build.json').map(f => [path.relative(www, f).replaceAll('\\', '/'), digest(f)])) };
fs.writeFileSync(path.join(www, 'cmc-build.json'), JSON.stringify(marker, null, 2));
run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android']);
const android = path.join(root, 'android');
// Capacitor adds its Cordova bridge shims during sync. Bind the complete native asset tree,
// including those generated files, before Gradle verifies and packages it.
const nativePublic = path.join(android, 'app/src/main/assets/public');
marker.webFiles = Object.fromEntries(files(nativePublic).filter(f => path.basename(f) !== 'cmc-build.json')
  .map(f => [path.relative(nativePublic, f).replaceAll('\\', '/'), digest(f)]));
fs.writeFileSync(path.join(nativePublic, 'cmc-build.json'), JSON.stringify(marker, null, 2));
const native = config.nativeVariant;
const tasks = [`assemble${native[0].toUpperCase()}${native.slice(1)}`];
if (native === 'release') tasks.push('bundleRelease');
if (process.platform === 'win32') run('cmd.exe', ['/d', '/s', '/c', `gradlew.bat ${tasks.join(' ')} --no-daemon`], android);
else run('./gradlew', [...tasks, '--no-daemon'], android);
const destination = path.join(root, 'reports/android-packages', `${config.environment}-${config.variant}`);
fs.mkdirSync(destination, { recursive: true });
const candidates = config.variant === 'release' ? [
  config.signing === 'unsigned' ? 'android/app/build/outputs/apk/release/app-release-unsigned.apk' : 'android/app/build/outputs/apk/release/app-release.apk',
  'android/app/build/outputs/bundle/release/app-release.aab',
] : [`android/app/build/outputs/apk/${native}/app-${native}.apk`];
const packages = candidates.map(relative => {
  if (!fs.existsSync(path.join(root, relative))) throw new Error(`Expected Android artifact is missing: ${relative}`);
  const source = path.join(root, relative); const target = path.join(destination, path.basename(source));
  fs.copyFileSync(source, target);
  return { path: path.relative(root, target).replaceAll('\\', '/'), bytes: fs.statSync(target).size, sha256: digest(target) };
});
if (!packages.length) throw new Error('Expected Android artifacts were not generated.');
fs.writeFileSync(path.join(destination, 'build-report.json'), JSON.stringify({ ...marker, webFiles: undefined,
  signing: config.signing, generatedAt: new Date().toISOString(), packages }, null, 2));
console.log(JSON.stringify({ environment: config.environment, variant: config.variant, signing: config.signing, packages }, null, 2));
