// Validates CLI/collection wiring against a synthetic loopback responder.
// This is NOT backend integration evidence and does NOT reproduce business logic.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { renameSync } from 'node:fs';

const server = http.createServer((request, response) => {
  let status = 200;
  let body = { content: [] };
  if (request.url.includes('not-a-number')) status = 400;
  else if (request.url.includes('9223372036854775807')) status = 404;
  else if (request.url.endsWith('/login')) status = 400;
  else if (!request.url.includes('/public/')) status = 401;
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
});
server.listen(0, '127.0.0.1', () => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const child = spawn(process.execPath, ['scripts/run-api-tests.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, API_BASE_URL: origin, API_AUTHORIZED_ORIGIN: origin,
      API_TEST_AUTHORIZED: 'true', API_TEST_SUITE: 'PUBLIC_CONTRACT' },
  });
  child.on('exit', (code) => {
    server.close();
    try { renameSync('reports/api-PUBLIC_CONTRACT.xml', 'reports/api-tooling-SYNTHETIC.xml'); }
    catch { process.exitCode = 1; }
    process.exitCode = process.exitCode || code || 0;
    console.log('SYNTHETIC TOOLING CHECK ONLY — backend integration remains PENDING.');
  });
});
