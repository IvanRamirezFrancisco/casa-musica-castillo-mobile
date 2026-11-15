import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/activity4/VALIDATION.json'), 'utf8'));
const digest = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const failures = [];
for (const [file, hash] of Object.entries({ ...manifest.sourceSha256, ...manifest.screenshotSha256 })) {
  if (!fs.existsSync(path.join(root, file)) || digest(file) !== hash) failures.push(file);
}
if (fs.existsSync(path.join(root, manifest.apk.path)) && digest(manifest.apk.path) !== manifest.apk.sha256) failures.push(manifest.apk.path);
if (failures.length) { console.error('Evidence differs:', failures); process.exitCode = 1; }
else console.log('Source and screenshot hashes match the recorded local evidence. This does not execute tests or validate the backend.');
