import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Select existing tests in place: no imports/re-export copies and no double counting.
export const specifications = [
  'src/app/core/factories/demo-order.factory.spec.ts',
  'src/app/core/services/cart.service.spec.ts',
  'src/app/core/services/checkout-quote-state.service.spec.ts',
  'src/app/core/services/public-catalog.service.spec.ts',
  'src/app/core/infrastructure/http-public-catalog.repository.spec.ts',
  'src/app/core/api/checkout.validation.spec.ts',
  'src/app/core/security/session-security.integration.spec.ts',
  'src/app/features/checkout/connected-checkout.integration.spec.ts',
  'src/app/features/profile/connected-profile.integration.spec.ts',
  'src/app/app.routes.integration.spec.ts',
];
const root = fileURLToPath(new URL('../', import.meta.url));
const args = ['node_modules/@angular/cli/bin/ng.js', 'test', '--watch=false',
  '--runner-config=test/vitest.serial.config.mjs',
  ...specifications.map(path => `--include=${path}`), ...process.argv.slice(2)];
const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
if (result.error) { console.error('No se pudo iniciar Angular TestBed.'); process.exitCode = 1; }
else process.exitCode = result.status ?? 1;
