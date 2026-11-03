// Real native matrix. A cold WebView per profile avoids stale CDP viewport metrics after resize.
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
const adbExe = process.env.ADB ?? 'adb';
const adb = (...args) => execFileSync(adbExe, ['-s', 'emulator-5554', ...args], { timeout: 30000 });
const dir = 'reports/activity4-close/';
fs.mkdirSync(dir, { recursive: true });
const originalRotation = adb('shell', 'settings', 'get', 'system', 'user_rotation').toString().trim();
const originalAuto = adb('shell', 'settings', 'get', 'system', 'accelerometer_rotation').toString().trim();
const launch = () => {
  adb('shell', 'am', 'force-stop', 'com.casademusicacastillo.app');
  adb('shell', 'am', 'start', '-W', '-n', 'com.casademusicacastillo.app/.MainActivity');
};
const profiles = [];
try {
  for (const [size, density, rotation, label] of [
    ['320x568', '160', '0', 'pequeno'], ['800x1280', '160', '0', 'tableta'], ['reset', 'reset', '1', 'horizontal'],
  ]) {
    adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0');
    adb('shell', 'settings', 'put', 'system', 'user_rotation', rotation);
    adb('shell', 'wm', 'size', size);
    adb('shell', 'wm', 'density', density);
    launch();
    const run = spawnSync(process.execPath, ['test/android-profile-capture.mjs', label], { stdio: 'inherit' });
    if (run.status !== 0) throw Error('Native profile failed: ' + label);
    profiles.push(JSON.parse(fs.readFileSync(dir + label + '-layout.json', 'utf8')));
  }
  fs.writeFileSync(dir + 'android-store-layout.json', JSON.stringify({ status: 'geometry-passed-awaiting-visual-review', profiles }, null, 2));
} catch (error) {
  fs.writeFileSync(dir + 'android-store-layout.json', JSON.stringify({ status: 'partial', error: error.message, profiles }, null, 2));
  process.exitCode = 1;
} finally {
  adb('shell', 'wm', 'size', 'reset'); adb('shell', 'wm', 'density', 'reset');
  adb('shell', 'settings', 'put', 'system', 'user_rotation', originalRotation);
  adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', originalAuto);
  launch();
}
