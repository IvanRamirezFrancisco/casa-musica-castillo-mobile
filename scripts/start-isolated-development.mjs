import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Separate from ordinary Development (8080) and all production build configurations.
const origin = 'http://127.0.0.1:18083';
try {
  const response = await fetch(`${origin}/actuator/health`, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  if (!response.ok || (await response.json()).status !== 'UP') throw new Error('not ready');
} catch {
  console.error('El backend aislado no está disponible en 127.0.0.1:18083. Inicia primero la candidata fix/account-activation-hardening con PostgreSQL de prueba y Mailpit.');
  process.exit(1);
}
console.log(`Development aislado: API ${origin}. La capacidad de contraseña seguirá comprobándose con la sesión real.`);
const cli = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));
const child = spawn(process.execPath, [cli, 'serve', '--configuration', 'development', '--host', '127.0.0.1',
  '--port', '14200', `--define=CMC_DEVICE_API_URL="${origin}"`, ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true });
child.on('error', () => { console.error('No se pudo iniciar Angular Development.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
