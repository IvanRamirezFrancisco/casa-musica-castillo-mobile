// Creates a private local bootstrap password; never prints it or starts infrastructure.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const file = fileURLToPath(new URL('.env', import.meta.url));
if (fs.existsSync(file)) throw new Error('Private local configuration already exists; preserve it.');
fs.writeFileSync(file, `TT05_BOOTSTRAP_PASSWORD=${randomBytes(32).toString('hex')}\n`, { mode: 0o600, flag: 'wx' });
console.log('Private bootstrap configuration created; no database or container was started.');
