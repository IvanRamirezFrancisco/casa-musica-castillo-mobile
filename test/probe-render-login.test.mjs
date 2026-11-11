import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, '../scripts/probe-render-login.ps1');

function makeFakeJwt(payload = { sub: '7', exp: Math.floor(Date.now() / 1000) + 3600 }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS512', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesignature1234567890`;
}

function runProbe(origin, timeoutSeconds = 5, email = 'synthetic-probe@example.test', password = 'Synthetic#Pass123!') {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
        '-Origin',
        origin,
        '-TimeoutSeconds',
        String(timeoutSeconds),
        '-NonInteractive',
      ],
      {
        env: {
          ...process.env,
          CMC_PROBE_EMAIL: email,
          CMC_PROBE_PASSWORD: password,
        },
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      const out = stdout.trim();
      const err = stderr.trim();
      assert.doesNotMatch(out, new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.doesNotMatch(out, /Synthetic#Pass123!/);
      assert.doesNotMatch(err, /Synthetic#Pass123!/);
      resolve({
        exitCode: code,
        stdout: out,
        stderr: err,
        parsed: out ? JSON.parse(out) : null,
      });
    });
  });
}

function withServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      req.resume();
      req.on('end', () => handler(req, res));
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(res)),
      });
    });
    server.on('error', reject);
  });
}

test('probe-render-login: classifies modern MFA challenge (preAuthChallenge present) and strips secrets', async () => {
  const secretChallenge = 'A'.repeat(43);
  const srv = await withServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'rndr-id': 'rndr-modern-2fa' });
    res.end(
      JSON.stringify({
        success: true,
        message: 'Two-factor authentication required',
        data: {
          twoFactorRequired: true,
          preAuthChallenge: secretChallenge,
          availableMethods: { EMAIL: true, GOOGLE_AUTHENTICATOR: true, BACKUP_CODE: false },
        },
      }),
    );
  });
  try {
    const res = await runProbe(srv.origin);
    assert.equal(res.exitCode, 0);
    assert.equal(res.parsed.transportOk, true);
    assert.equal(res.parsed.status, 200);
    assert.equal(res.parsed.category, 'mfa_challenge_valid');
    assert.equal(res.parsed.twoFactorRequired, true);
    assert.equal(res.parsed.preAuthChallengePresent, true);
    assert.equal(res.parsed.legacyUserPresent, false);
    assert.deepEqual(res.parsed.availableMethods, ['EMAIL', 'GOOGLE_AUTHENTICATOR']);
    assert.equal(res.parsed.renderRequestId, 'rndr-modern-2fa');
    assert.doesNotMatch(res.stdout, new RegExp(secretChallenge));
  } finally {
    await srv.close();
  }
});

test('probe-render-login: classifies legacy incompatible MFA contract (twoFactorRequired + user without preAuthChallenge)', async () => {
  const srv = await withServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'rndr-id': 'rndr-legacy-2fa' });
    res.end(
      JSON.stringify({
        success: true,
        message: 'Two-factor authentication required',
        data: {
          twoFactorRequired: true,
          user: { id: 42, email: 'private-user@example.test', firstName: 'Private' },
          availableMethods: { EMAIL: true, GOOGLE_AUTHENTICATOR: false, BACKUP_CODE: false },
        },
      }),
    );
  });
  try {
    const res = await runProbe(srv.origin);
    assert.equal(res.exitCode, 0);
    assert.equal(res.parsed.status, 200);
    assert.equal(res.parsed.category, 'incompatible_mfa_legacy');
    assert.equal(res.parsed.twoFactorRequired, true);
    assert.equal(res.parsed.preAuthChallengePresent, false);
    assert.equal(res.parsed.legacyUserPresent, true);
    assert.doesNotMatch(res.stdout, /private-user@example\.test/);
  } finally {
    await srv.close();
  }
});

test('probe-render-login: classifies direct authenticated session without exposing JWT', async () => {
  const jwt = makeFakeJwt();
  const srv = await withServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: {
          jwtResponse: {
            accessToken: jwt,
            tokenType: 'Bearer',
            user: { id: 7, email: 'private@example.test' },
          },
        },
      }),
    );
  });
  try {
    const res = await runProbe(srv.origin);
    assert.equal(res.exitCode, 0);
    assert.equal(res.parsed.category, 'authenticated_session');
    assert.equal(res.parsed.jwtPresent, true);
    assert.equal(res.parsed.jwtHasExp, true);
    assert.doesNotMatch(res.stdout, new RegExp(jwt.split('.')[1]));
    assert.doesNotMatch(res.stdout, /private@example\.test/);
  } finally {
    await srv.close();
  }
});

test('probe-render-login: classifies HTTP 401 invalid credentials, 429 rate limiting, 500 backend error, and 302 redirect', async () => {
  let mode = '401';
  const srv = await withServer((req, res) => {
    if (mode === '401') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Credenciales inválidas' }));
    } else if (mode === '429') {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '900' });
      res.end(JSON.stringify({ message: 'Cuenta bloqueada', remainingTimeSeconds: 895 }));
    } else if (mode === '500') {
      res.writeHead(500, { 'Content-Type': 'application/json', 'rndr-id': 'rndr-500' });
      res.end(JSON.stringify({ status: 500, error: 'Internal Server Error' }));
    } else if (mode === '302') {
      res.writeHead(302, { Location: 'https://example.test/login?secret=tok123' });
      res.end();
    }
  });
  try {
    const r401 = await runProbe(srv.origin);
    assert.equal(r401.parsed.status, 401);
    assert.equal(r401.parsed.category, 'invalid_credentials');

    mode = '429';
    const r429 = await runProbe(srv.origin);
    assert.equal(r429.parsed.status, 429);
    assert.equal(r429.parsed.category, 'rate_limited');
    assert.equal(r429.parsed.remainingTimeSeconds, 895);
    assert.equal(r429.parsed.retryAfterHeader, '900');

    mode = '500';
    const r500 = await runProbe(srv.origin);
    assert.equal(r500.parsed.status, 500);
    assert.equal(r500.parsed.category, 'backend_error');
    assert.equal(r500.parsed.renderRequestId, 'rndr-500');

    mode = '302';
    const r302 = await runProbe(srv.origin);
    assert.equal(r302.parsed.status, 302);
    assert.equal(r302.parsed.category, 'redirect');
    assert.equal(r302.parsed.redirectLocationScheme, 'https');
    assert.doesNotMatch(r302.stdout, /tok123/);
  } finally {
    await srv.close();
  }
});

test('probe-render-login: classifies timeout, TCP error, and DNS error without throwing generic message', async () => {
  // 1. Timeout test
  const slowSrv = await withServer((req, res) => {
    setTimeout(() => {
      res.writeHead(200);
      res.end('{}');
    }, 3000);
  });
  try {
    const rTimeout = await runProbe(slowSrv.origin, 1);
    assert.equal(rTimeout.exitCode, 1);
    assert.equal(rTimeout.parsed.transportOk, false);
    assert.equal(rTimeout.parsed.category, 'timeout');
  } finally {
    await slowSrv.close();
  }

  // 2. TCP connection refused (closed local port)
  const closedSrv = await withServer((req, res) => res.end());
  const closedOrigin = closedSrv.origin;
  await closedSrv.close();
  const rTcp = await runProbe(closedOrigin, 5);
  assert.equal(rTcp.exitCode, 1);
  assert.equal(rTcp.parsed.transportOk, false);
  assert.equal(rTcp.parsed.category, 'tcp_error');

  // 3. DNS resolution failure (.invalid RFC 2606)
  const rDns = await runProbe('https://nonexistent-domain-probe.invalid', 10);
  assert.equal(rDns.exitCode, 1);
  assert.equal(rDns.parsed.transportOk, false);
  assert.equal(rDns.parsed.category, 'dns_error');
});

test('probe-render-login: cold-start warmup runs automatically, probes /api/auth/me, and never repeats login attempts', async () => {
  let healthCalls = 0;
  let meCalls = 0;
  let loginCalls = 0;
  const srv = await withServer((req, res) => {
    if (req.url === '/api/health') {
      healthCalls++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'UP' }));
      return;
    }
    if (req.url === '/api/auth/me') {
      meCalls++;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 500, error: 'Internal Server Error', secretOtp: '987654' }));
      return;
    }
    if (req.url === '/api/auth/login') {
      loginCalls++;
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Bad credentials', leakedOtp: '654321' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  try {
    const res = await runProbe(srv.origin);
    assert.equal(res.exitCode, 0);
    assert.equal(healthCalls, 1);
    assert.equal(meCalls, 1);
    assert.equal(loginCalls, 1);
    assert.equal(res.parsed.warmupHealthStatus, 200);
    assert.equal(res.parsed.unauthenticatedMeStatus, 500);
    assert.equal(res.parsed.status, 401);
    assert.equal(res.parsed.category, 'invalid_credentials');
    assert.doesNotMatch(res.stdout, /987654|654321/);
  } finally {
    await srv.close();
  }
});
