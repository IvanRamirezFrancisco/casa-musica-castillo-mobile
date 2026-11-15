// Controlled HTTP fixture only. No Spring Boot, PostgreSQL, SMTP or commercial services.
import http from 'node:http';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
export async function startFixture(port = 18181) {
  const state = { issued: new Map(), allTokens: new Set(), revoked: false, logins: 0, me: 0, logout: 0, mfa: 0, emails: 0 };
  const user = id => ({ id, email: id === 7 ? 'qa@example.test' : 'mfa@example.test', firstName: id === 7 ? 'QA' : 'MFA',
    lastName: 'Sesion', phone: null, roles: ['ROLE_CUSTOMER'], enabled: true, twoFactorEnabled: id === 8,
    emailEnabled: id === 8, googleAuthEnabled: false, backupCodesEnabled: false, createdAt: null, updatedAt: null });
  const issue = id => {
    const token = `${encode({ alg: 'HS512', typ: 'JWT' })}.${encode({ sub: String(id), exp: Math.floor(Date.now()/1000)+3600, jti: `synthetic-${state.logins}-${state.mfa}` })}.c3ludGhldGljLW9ubHk`;
    state.issued.set(token, id); state.allTokens.add(token);
    return { accessToken: token, tokenType: 'Bearer', user: user(id) };
  };
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !['https://localhost', 'http://localhost'].includes(origin)) { res.writeHead(403); res.end(); return; }
    res.setHeader('Access-Control-Allow-Origin', origin ?? 'https://localhost');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
    const send = (code, data) => { res.writeHead(code); res.end(JSON.stringify(data)); };
    if (req.method === 'OPTIONS') { send(204, null); return; }
    let raw = ''; for await (const part of req) { raw += part; if (raw.length > 16000) { send(413, {}); return; } }
    let body; try { body = raw ? JSON.parse(raw) : {}; } catch { send(400, {}); return; }
    const path = new URL(req.url, 'http://localhost').pathname;
    const ok = data => send(200, { success: true, data });
    if (req.method === 'POST' && path === '/api/auth/login') {
      if (body.password !== 'Only-Local-123' || !['qa@example.test', 'mfa@example.test'].includes(body.email)) { send(401, {}); return; }
      state.logins++;
      if (body.email === 'mfa@example.test') { ok({ twoFactorRequired: true, preAuthChallenge: 'M'.repeat(43), availableMethods: { EMAIL: true } }); return; }
      ok({ jwtResponse: issue(7) }); return;
    }
    if (req.method === 'POST' && path === '/api/2fa/send-login-code' && body.preAuthChallenge === 'M'.repeat(43)) { state.emails++; ok(null); return; }
    if (req.method === 'POST' && path === '/api/2fa/verify') {
      if (body.preAuthChallenge !== 'M'.repeat(43) || body.method !== 'EMAIL' || body.code !== '123456' || state.emails !== 1) { send(401, {}); return; }
      state.mfa++; ok(issue(8)); return;
    }
    const token = req.headers.authorization?.replace(/^Bearer /, ''); const id = state.issued.get(token);
    if (path === '/api/auth/me' || path === '/api/users/profile' || path === '/api/auth/logout') {
      if (!id || state.revoked) { send(401, {}); return; }
      if (path === '/api/auth/me') { state.me++; send(200, user(id)); return; }
      if (path === '/api/auth/logout') { state.logout++; state.issued.delete(token); ok(null); return; }
      ok(user(id)); return;
    }
    if (req.method === 'GET' && path.startsWith('/api/public/')) {
      if (path.endsWith('/catalog') || path.endsWith('/featured')) { send(200, { content: [], number: 0, size: 6, totalElements: 0, totalPages: 0, first: true, last: true }); return; }
      send(200, []); return;
    }
    send(404, { success: false });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { state, close: () => new Promise(resolve => server.close(resolve)) };
}
