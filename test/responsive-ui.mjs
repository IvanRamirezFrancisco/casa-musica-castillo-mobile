// Chrome viewport checks against localhost. The browser intercepts HTTP only for this test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.env.CMC_UI_PORT ?? 4291);
assert.ok(Number.isInteger(port) && port > 0 && port < 65536, 'Invalid local test port');
const origin = 'http://127.0.0.1:' + port;
const baseline = process.argv.includes('--baseline');
const out = path.resolve('reports/uiux', baseline ? 'before' : 'after');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir(out, { recursive: true });
const profile = await mkdtemp(path.resolve('reports/uiux/chrome-'));
const chrome = spawn(process.env.CMC_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-background-networking', '--no-first-run',
  '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let ws;
const rows = [];
const errors = [];
let canceledInterceptions = 0;
const fixtureImage = 'https://res.cloudinary.com/cmc-ui-fixture/product.svg';
const category = { id: 20, name: 'Instrumentos de cuerda y accesorios', description: null,
  imageUrl: null, parentId: null, parentName: null, activeProductCount: 8 };
const products = Array.from({ length: 8 }, (_, index) => ({
  id: 313 + index, sku: 'TEST-' + index, name: index === 0
    ? 'Jarana huasteca de estudio con nombre deliberadamente largo'
    : 'Instrumento de prueba ' + (index + 1),
  description: 'Descripción sintética para comprobar el diseño y la lectura.',
  detailedDescription: null, price: 6500, discountPrice: index === 0 ? 5900 : null, stock: 18,
  imageUrl: index === 0 ? fixtureImage : null, images: [], category, brand: null,
  attributes: [{ name: 'Material', value: 'Madera de prueba', displayOrder: null }], model: 'MODELO-1234567890',
  weight: index === 1 ? null : 1.3, dimensions: '10 × 20 × 30 cm',
  featured: true, averageRating: 0, reviewCount: 0,
}));
const page = { content: products, number: 0, size: 12, totalElements: products.length, totalPages: 1, first: true, last: true };
const emptyPage = { ...page, content: [], totalElements: 0, totalPages: 0 };
const user = { id: 7, firstName: 'Ana', lastName: 'Prueba', email: 'ana@example.test',
  phone: '5512345678', enabled: true, twoFactorEnabled: false, roles: ['ROLE_CUSTOMER'] };
const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url');
const accessToken = [encode({ alg: 'HS256', typ: 'JWT' }),
  encode({ sub: '7', exp: Math.floor(Date.now() / 1000) + 3600 }), 'c2lnbmF0dXJl'].join('.');
const wrap = (data) => ({ success: true, data });
const cart = { cartId: 9, items: [{
  itemId: 50, productId: 313, productName: products[0].name, productImage: fixtureImage,
  productSku: products[0].sku, quantity: 2, unitPrice: 5900, subtotal: 11800,
  availableStock: 18, available: true, availabilityStatus: 'IN_STOCK', warningMessage: null,
}], totalItems: 2, subtotal: 11800, tax: 1888, discount: 0, total: 13688,
couponCode: null, canCheckout: true, warningMessage: null };
let useSecondFactor = false;
let emailEnabled = false;
let totpEnabled = false;
let backupCodesEnabled = false;
const qrPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAIAAAAErfB6AAADUklEQVR4nO3dQW4cIRAFUB8hyxzC979esrLUmtLYNFDQlN+Xl9QUn+dNJGvy8U9K52P3BSQ3gIsHcPEALh7AxQO4eAAXD+DiAVw8gIsHcPEALh7AxXMD+PPvn6f9tN8z4+QDu8cABnxaScDXAAZ8WknA1wAGfFpJwNeMArePD2Zwe4blvHLTLh8DuOnkud0BN508tzvgppPndgfcdPLc7oCbTp7bHXDTyXO7pwC3v9HgZ9r+YwCX2h4DuNT2GMCltscALrU9BnCp7TGAS22PKQg82CjjnoABAwYM+G4Ad655WslbjQCfV/JWI8DnlbzVCPDTSy77VXhg9xjApbrHAC7VPQZwqe4xgEt1jwFcqnsM4FLdYwr+VWXGa57SPQbw5PGMAP75JODcNeMBDPi7k4Bz14wHMODvTgLuXLP3Z/A5MtT3do8BDPi0koCvAQz4tJKArwEM+LSSgK8p+I3vy34/jgjgpvHlJaYFcNP48hLTArhpfHmJaQHcNL68xLQAbhpfXmJaADeNLy8xLZv/qnJwfBBjb6OMRTGAAS+/JWDAgAE/vlHGohjAgJffEvAe4MGrZ4y3f+YpvzSD3WMAA/42gLsbAZ55JcCdAdzdCPDMKwHuDODuRo8DHnyOZe++7DMfuD0GMOD7V89ofsoTAwYMGHDv9hjAgO9fPaP5KU98MPApGXmO7f+Qnf6ZgPvHAe8J4GsA948D3hPA1wDuHwe8J4CvKfgdHYOXbx/PODm9O2DAky4EeO57NhYHDHjShQDPfc/G4oABT7oQ4Lnv2Vj8t3zje/vJverTAxjwVwAvuNL0AAb8FcALrjQ9gAF/BfCCK03Pb/n/gwefeFmj6ZcH3N8dMGDAgAHnbR/sDhgwYMCA724fbLRs0eDJxgAGPOmWgAEDBgz4ZgADnnRLwIDnNF+2fe/4G6XXAAZ8fw3gBeNvlF4DGPD9NYAXjL9Reg1gwPfXAF4w/kbpNQX/qnJwfNmijPEYwNsWZYzHAN62KGM8BvC2RRnjMYC3LcoYjwG8bVHGeAzgbYsyxmMKfkfHspMZ44OLYgADzrwlYMCAATfcM+MkYMCJT9eoBhiwnBzAxQO4eAAXD+DiAVw8gIsHcPEALh7AxQO4eAAXD+Di+Q8W7IxdQi/0CgAAAABJRU5ErkJggg==";
function fixture(method, pathname) {
  if (pathname === '/api/auth/login' && method === 'POST') {
    return useSecondFactor
      ? wrap({ twoFactorRequired: true, preAuthChallenge: 'A'.repeat(43),
        availableMethods: { EMAIL: true, GOOGLE_AUTHENTICATOR: true, BACKUP_CODE: false } })
      : wrap({ jwtResponse: { accessToken, tokenType: 'Bearer', user } });
  }
  if (method === 'POST' && pathname === '/api/2fa/send-login-code') return wrap({});
  if (method === 'POST' && pathname === '/api/2fa/verify') return { success: false };
  if (method === 'POST' && pathname === '/api/2fa/email/enable') {
    emailEnabled = true;
    return wrap({});
  }
  if (method === 'POST' && pathname === '/api/2fa/email/disable') {
    emailEnabled = false;
    return wrap({});
  }
  if (method === 'POST' && pathname === '/api/2fa/google/setup') {
    return wrap({ manualEntryKey: 'JBSWY3DPEHPK3PXP', qrCode: qrPng });
  }
  if (method === 'POST' && pathname === '/api/2fa/google/confirm') {
    totpEnabled = true;
    return wrap({});
  }
  if (method === 'POST' && pathname === '/api/2fa/backup-codes/generate') {
    backupCodesEnabled = true;
    return wrap({ count: 10, codes: ['8492-1034', '7319-4820', '5920-3841', '1049-2938', '6648-2019', '9910-4482', '3182-7741', '4401-8829', '2749-6103', '5018-9374'] });
  }
  if (method !== 'GET') return undefined;
  if (pathname === '/api/auth/me') return user;
  if (pathname === '/api/wishlist') return {
    items: [{ wishlistId: 9, productId: products[0].id, productName: products[0].name, productImage: null,
      currentPrice: 5900, available: true, availableStock: 18 }],
    totalItems: 1,
  };
  if (pathname === '/api/2fa/methods') {
    return wrap({ EMAIL: emailEnabled, GOOGLE_AUTHENTICATOR: totpEnabled, BACKUP_CODES: backupCodesEnabled });
  }
  if (pathname === '/api/2fa/backup-codes/status') {
    return wrap({ enabled: backupCodesEnabled, available: backupCodesEnabled ? 10 : 0, total: backupCodesEnabled ? 10 : 0, used: 0, hasActiveCodes: backupCodesEnabled, canGenerate: totpEnabled });
  }
  if (pathname === '/api/users/security-settings') {
    return wrap({ twoFactorEnabled: emailEnabled || totpEnabled, googleAuthEnabled: totpEnabled, emailEnabled, backupCodesEnabled, emailVerified: true, passwordChangeRevokesSessions: true });
  }
  if (pathname === '/api/users/profile') return wrap(user);
  if (pathname === '/api/cart' || pathname === '/api/cart/summary') return cart;
  if (pathname === '/api/orders/my') return emptyPage;
  if (pathname === '/api/public/categories/active') return [category];
  if (pathname === '/api/public/products/latest') return products;
  if (['/api/public/products/catalog', '/api/public/products/featured'].includes(pathname)) return page;
  if (/^\/api\/public\/products\/\d+$/.test(pathname)) return products.find((p) => pathname.endsWith('/' + p.id));
  if (pathname.startsWith('/api/reviews/product/')) return { reviews: [], totalReviews: 0, currentPage: 0, totalPages: 0, statistics: null };
}

function isVisible(element) {
  return element && element.getBoundingClientRect().width > 0 &&
    !element.closest('.ion-page-hidden,[aria-hidden=true]');
}

async function measure(isVisible, selector) {
  const bar = location.pathname.startsWith('/main/') ? [...document.querySelectorAll('ion-tab-bar')].find(isVisible) : undefined;
  const modal = document.querySelector('ion-modal.show-modal');
  const last = selector ? [...document.querySelectorAll(selector)].filter(isVisible).at(-1) : undefined;
  const content = last?.closest('ion-content') ?? [...(modal || document).querySelectorAll('ion-content')].filter(isVisible).at(-1);
  const scroll = await content?.getScrollElement?.();
  // Let Ionic and the browser settle reflow after a viewport or inset change.
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  if (last && scroll) {
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'instant' });
    await new Promise(requestAnimationFrame);
    if (last.getBoundingClientRect().bottom > scroll.getBoundingClientRect().bottom) {
      last.scrollIntoView({ block: 'end', behavior: 'instant' });
    }
  }
  await new Promise(requestAnimationFrame);
  const image = [...document.querySelectorAll('img')].find((element) =>
    isVisible(element) && element.src.includes('/cmc-ui-fixture/'));
  return {
    image: image && [image.naturalWidth, image.naturalHeight, getComputedStyle(image).objectFit],
    barBottom: bar ? bar.getBoundingClientRect().bottom : null,
    barLeft: bar ? bar.getBoundingClientRect().left : null,
    viewport: [innerWidth, innerHeight],
    docOverflow: document.documentElement.scrollWidth - innerWidth,
    scrollOverflow: scroll ? scroll.scrollWidth - scroll.clientWidth : 0,
    scrollBottom: scroll?.getBoundingClientRect().bottom ?? null,
    targetBottom: last ? last.getBoundingClientRect().bottom : null,
    barTop: bar && !modal ? bar.getBoundingClientRect().top : null,
    barOverflow: bar ? bar.scrollWidth - bar.clientWidth : 0,
    minTabWidth: bar ? Math.min(...[...bar.querySelectorAll('ion-tab-button')].map(e => e.getBoundingClientRect().width)) : null,
    columns: getComputedStyle(document.querySelector('.products-grid') ?? document.body).gridTemplateColumns,
    detailColumns: getComputedStyle(document.querySelector('.product-layout') ?? document.body).gridTemplateColumns,
    weight: [...document.querySelectorAll('.spec-list dt')].find(e => e.textContent.includes('Peso'))?.nextElementSibling?.textContent?.trim(),
  };
}

try {
  let port;
  for (let attempt = 0; attempt < 60 && !port; attempt++) {
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
    catch { await sleep(200); }
  }
  assert.ok(port, 'Chrome debug port unavailable');
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  function rpc(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function requestPaused({ requestId, request }) {
    const url = new URL(request.url);
    if (url.href === fixtureImage) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><rect width="160" height="80" fill="#722f37"/><circle cx="80" cy="40" r="28" fill="#e8cc8b"/></svg>';
      await rpc('Fetch.fulfillRequest', { requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }],
        body: Buffer.from(svg).toString('base64') });
      return;
    }
    if (url.origin === origin && !url.pathname.startsWith('/api/')) {
      await rpc('Fetch.continueRequest', { requestId });
      return;
    }
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.startsWith('/api/')) {
      await rpc('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
      return;
    }
    const data = fixture(request.method, url.pathname);
    const status = request.method === 'POST' && url.pathname === '/api/2fa/verify' ? 401 : 200;
    if (data === undefined && request.method !== 'OPTIONS') errors.push(request.method + ' ' + url.pathname);
    await rpc('Fetch.fulfillRequest', {
      requestId, responseCode: request.method === 'OPTIONS' ? 204 : data === undefined ? 404 : status,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: origin },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
        { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
      ],
      body: Buffer.from(data === undefined ? '' : JSON.stringify(data)).toString('base64'),
    });
  }
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const { id } = message;
    if (typeof id === 'number' && Number.isSafeInteger(id)) {
      const reply = pending.get(id);
      if (!reply) return;
      pending.delete(id);
      clearTimeout(reply.timer);
      if (message.error) reply.reject(new Error(message.error.message));
      else reply.resolve(message.result);
      return;
    }
    if (message.method === 'Fetch.requestPaused') {
      void requestPaused(message.params).catch((error) => {
        // A navigation can cancel an intercepted request before Chrome receives the response.
        if (error.message === 'Invalid InterceptionId.') canceledInterceptions++;
        else errors.push(error.message);
      });
    }
  });
  const read = async (expression) => {
    const result = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'DOM observation failed');
    return result.result.value;
  };
  async function wait(expression) {
    const end = Date.now() + 15000;
    while (Date.now() < end) {
      try { if (await read(expression)) return; } catch (error) {
        if (!String(error).includes('context')) throw error;
      }
      await sleep(120);
    }
    throw new Error('UI condition not reached: ' + expression + ' · ' + await read('document.body.innerText.slice(0, 400)'));
  }
  const find = (selector) => '[...document.querySelectorAll(' + JSON.stringify(selector) + ')].find(' + isVisible.toString() + ')';
  async function go(route, selector) {
    await rpc('Page.navigate', { url: origin + route });
    await wait('location.pathname===' + JSON.stringify(new URL(route, origin).pathname) + ' && !!' + find(selector));
    await sleep(160);
  }
  async function click(selector) {
    await wait('!!' + find(selector));
    await read('(() => { const e = ' + find(selector) + '; e.focus(); (e.shadowRoot?.querySelector("a") ?? e).click(); })()');
    await sleep(220);
  }
  async function submitLogin() {
    for (const [type, value] of [['email', user.email], ['password', 'Only-Local-Layout-123']]) {
      await read(find('app-connected-login input[type=' + type + ']') + '.focus()');
      await rpc('Input.insertText', { text: value });
    }
    await read(find('app-connected-login form.auth-form') + '.requestSubmit()');
  }
  const resize = (width, height) => rpc('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
  async function capture(label, screen, lastSelector = null) {
    const geometry = await read('(' + measure.toString() + ')(' + isVisible.toString() + ',' + JSON.stringify(lastSelector) + ')');
    rows.push({ label, screen, ...geometry });
    const png = await rpc('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(out, label + '-' + screen + '.png'), Buffer.from(png.data, 'base64'));
    if (baseline) return;
    assert.ok(geometry.docOverflow <= 1 && geometry.scrollOverflow <= 1 && geometry.barOverflow <= 1, label + ' ' + screen + ': overflow');
    if (geometry.barTop !== null && geometry.scrollBottom !== null) {
      assert.ok(geometry.scrollBottom <= geometry.barTop + 1, label + ' ' + screen + ': scroller crosses navigation');
      assert.ok(geometry.minTabWidth >= 44, label + ': touch target width');
    }
    if (geometry.targetBottom !== null && geometry.scrollBottom !== null) {
      assert.ok(geometry.targetBottom <= geometry.scrollBottom + 1, label + ' ' + screen + ': last control unreachable (' + geometry.targetBottom + ' > ' + geometry.scrollBottom + ')');
    }
    if (geometry.image) {
      assert.deepEqual(geometry.image.slice(0, 2), [160, 80], label + ': fixture image dimensions');
      assert.ok(['contain', 'cover'].includes(geometry.image[2]), label + ': image aspect ratio');
    }
    if (screen === 'detalle') assert.equal(geometry.weight?.replace(/\s+/g, ' '), '1.3 kg');
  }
  await rpc('Page.enable');
  await rpc('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await rpc('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const sizes = baseline ? [[375, 667, '375x667']] : [
    [320, 640, '320x640'], [360, 640, '360x640'], [375, 667, '375x667'], [390, 844, '390x844'],
    [412, 915, '412x915'], [344, 882, 'plegado'], [690, 829, 'abierto'], [768, 1024, '768x1024'],
    [820, 1180, '820x1180'], [1024, 1366, '1024x1366'], [1280, 800, '1280x800'],
    [1024, 768, 'tablet-horizontal'], [667, 375, 'telefono-horizontal'],
  ];
  for (const [width, height, label] of sizes) {
    await resize(width, height);
    await go('/main/catalog', '.product-card');
    await capture(label, 'catalogo', '.paging button:last-child');
    if (!baseline && width >= 768) {
      await wait("!!" + find('.catalog-filters-inline fieldset'));
      await read("document.querySelector('.catalog-filters-inline').scrollIntoView({block:'start'})");
      await capture(label, 'filtros');
      if (width === 768) {
        await click('.catalog-filters-inline input[name=category]:last-of-type' + ':not(:checked)');
        await click('.catalog-filters-inline button[type=submit]');
        await wait("location.search.includes('categoryId=20')");
      }
    } else {
      await click('.catalog-controls button');
      await wait("!!document.querySelector('ion-modal.show-modal .sheet-actions')");
      await capture(label, 'filtros', 'ion-modal.show-modal .sheet-actions button:last-child');
      if (!baseline && label === '375x667') {
        for (const type of ['rawKeyDown', 'keyUp']) {
          await rpc('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        }
        await wait("!document.querySelector('ion-modal.show-modal')");
        await wait("document.activeElement === document.querySelector('.catalog-controls button')");
      } else {
        await click('.sheet-close');
        await wait("!document.querySelector('ion-modal.show-modal')");
      }
    }
    await go('/products/313', '.product-summary h1');
    await capture(label, 'detalle');
    if (!baseline && ['320x640', '375x667', 'abierto', 'tablet-horizontal', 'telefono-horizontal'].includes(label)) {
      await click('.cover-action');
      await wait("document.querySelector('.photo-viewer')?.open && document.querySelector('.viewer-photo')?.classList.contains('is-ready')");
      await click('[aria-label="Ampliar zoom"]');
      assert.match(await read("document.querySelector('[aria-label=\"Restablecer zoom\"]').textContent.trim()"), /^150\s*%$/);
      assert.ok(await read("document.querySelector('[aria-label=\"Cerrar visor\"]').getBoundingClientRect().height >= 44"));
      assert.ok(await read("document.querySelector('.photo-viewer').getBoundingClientRect().width <= innerWidth"));
      await capture(label, 'galeria');
      await click('[aria-label="Cerrar visor"]');
      await wait("!document.querySelector('.photo-viewer').open");
      assert.equal(await read("document.activeElement.classList.contains('cover-action')"), true);
    }
    await go('/main/home', 'app-public-home .store-hero');
    await capture(label, 'inicio');
    await go('/login', 'app-connected-login input[type=email]');
    await capture(label, 'login');
    await submitLogin();
    await wait("location.pathname==='/main/home'");
    for (const [tab, view] of [['cart', 'app-connected-cart'], ['profile', 'app-connected-profile-view']]) {
      await click('ion-tab-button[tab=' + tab + ']');
      await wait('location.pathname===' + JSON.stringify('/main/' + tab) + ' && !!' + find(view + ' ion-content'));
      await capture(label, tab, view + ' main button, ' + view + ' main a');
    }
    await click('app-connected-profile-view .profile-card[aria-label="Accesos de tu cuenta"] cmc-button:last-child button');
    await wait("location.pathname==='/profile/security' && !!document.querySelector('app-account-security main section')");
    await capture(label, 'seguridad');
    if (!baseline) {
      const secPass = 'app-account-security cmc-input[formcontrolname=password] input';
      await read(find(secPass) + '.scrollIntoView({ block: "center" })');
      await read(find(secPass) + '.focus()');
      if (label === '375x667') {
        await rpc('Input.insertText', { text: 'Cl4ve-Segura' });
        await wait("document.querySelector('app-account-security .password-strength')?.getAttribute('data-feedback') === 'positive'");
      }
      await capture(label, 'seguridad-final', 'app-account-security section:last-child button');
    }
    if (!baseline && label === '375x667') {
      await click('#security-email ~ cmc-button button');
      await wait("document.querySelector('#security-email ~ .security-state')?.textContent === 'Activado'");
      await read("document.querySelector('app-account-security .security-summary').scrollIntoView({ block: 'start' })");
      await capture(label, 'seguridad-confirmada');
      await click('#security-email ~ cmc-button button');
      await wait("!!document.querySelector('#email-stepup-password')");
      await read("document.querySelector('[aria-labelledby=\"security-email\"]').scrollIntoView({ block: 'center' })");
      await capture(label, 'seguridad-mfa-email');
      await click('[aria-labelledby="security-email"] .security-actions cmc-button:last-child button');
      await click('#security-totp ~ cmc-button button');
      await wait("!!document.querySelector('#totp-confirm')");
      await read("document.querySelector('[aria-labelledby=\"security-totp\"]').scrollIntoView({ block: 'center' })");
      await capture(label, 'seguridad-google-auth');
      await read(find('#totp-confirm') + '.focus()');
      await rpc('Input.insertText', { text: '123456' });
      await click('[aria-labelledby="security-totp"] .security-actions cmc-button:first-child button');
      await wait("document.querySelector('#security-totp ~ .security-state')?.textContent === 'Activado'");
      await click('[aria-labelledby="security-recovery"] .security-actions cmc-button:first-child button');
      await wait("!!document.querySelector('#backup-stepup-password')");
      await read(find('#backup-stepup-password') + '.focus()');
      await rpc('Input.insertText', { text: 'Cl4ve-Segura' });
      await click('[aria-labelledby="security-recovery"] .security-panel .security-actions cmc-button:first-child button');
      await wait("document.querySelectorAll('.security-codes li').length === 10");
      await read("document.querySelector('[aria-labelledby=\"security-recovery\"]').scrollIntoView({ block: 'center' })");
      await capture(label, 'seguridad-codigos-respaldo');
      totpEnabled = false;
      backupCodesEnabled = false;
      await go('/login', 'app-connected-login input[type=email]');
      await submitLogin();
      await wait("location.pathname==='/main/home'");
      await click('ion-tab-button[tab=profile]');
      await wait("location.pathname==='/main/profile' && !!document.querySelector('app-connected-profile-view .profile-card')");
      await read("[...document.querySelectorAll('app-connected-profile-view button')].find(button => button.textContent.includes('Mis favoritos')).click()");
      await wait("location.pathname==='/favorites' && !!document.querySelector('.favorite-card')");
      await capture(label, 'favoritos', '.favorite-card button');
      await go('/forgot-password', 'app-connected-forgot-password input[type=email]');
      await capture(label, 'recuperacion', '.auth-footer button');
    }
    useSecondFactor = true;
    await go('/login', 'app-connected-login input[type=email]');
    await submitLogin();
    await wait("!!document.querySelector('#second-factor-title')");
    if (!baseline) await wait("document.activeElement?.id === 'second-factor-title'");
    await capture(label, 'mfa-solicitud');
    await click('app-connected-login .auth-form button');
    await wait("!!document.querySelector('app-connected-login input[autocomplete=one-time-code]')");
    await capture(label, 'mfa', 'app-connected-login .step-actions button');
    if (!baseline && label === '375x667') {
      await read(find('app-connected-login input[autocomplete=one-time-code]') + '.focus()');
      await rpc('Input.insertText', { text: '000000' });
      await resize(375, 350);
      assert.equal(await read(find('app-connected-login input[autocomplete=one-time-code]') + '.value'), '000000');
      await read(find('app-connected-login form.auth-form') + '.requestSubmit()');
      await wait("document.querySelector('[role=alert]')?.textContent.includes('Código inválido o vencido')");
      await capture('ventana-baja', 'mfa-error', 'app-connected-login .step-actions button');
      await resize(width, height);
    }
    useSecondFactor = false;
    await go('/register', 'app-connected-register input[type=email]');
    await capture(label, 'registro');
    if (!baseline && label === '375x667') {
      const password = 'app-connected-register cmc-input[formcontrolname=password] input';
      await read(find(password) + '.scrollIntoView({ block: "center" })');
      const point = await read('(() => { const r = ' + find(password) + '.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; })()');
      await rpc('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
      await rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
      await wait('document.activeElement === ' + find(password));
      await wait("!!document.querySelector('.password-guide')");
      await capture(label, 'registro-enfoque');
      await rpc('Input.insertText', { text: 'abcdefgh' });
      await wait("document.querySelector('.password-strength')?.getAttribute('data-feedback') === 'warning'");
      await wait("(() => { const field = document.activeElement.closest('[data-feedback]'); if (!field) return false; const s = getComputedStyle(field); return s.outlineColor === s.borderTopColor && parseFloat(s.outlineWidth) >= 2; })()");
      await capture(label, 'registro-requisito-pendiente');
      await read(find(password) + '.select()');
      await rpc('Input.insertText', { text: 'Cl4ve-Segura' });
      await wait("document.querySelector('.password-strength')?.getAttribute('data-feedback') === 'positive'");
      await capture(label, 'registro-requisitos-cumplidos');
      await read(find(password) + '.blur()');
      await wait("!document.querySelector('.password-guide')");
    }
    await go('/privacy', '.privacy-shell');
    await capture(label, 'privacidad');
  }
  if (!baseline) {
    await resize(344, 882);
    await go('/main/catalog', '.product-card');
    await read(find('#catalog-search') + '.focus()');
    await rpc('Input.insertText', { text: 'jarana' });
    await wait("location.search.includes('jarana')");
    await resize(690, 829);
    await capture('resize', 'catalogo', '.paging button:last-child');
    assert.equal(await read("document.querySelector('#catalog-search').value"), 'jarana');
    await read("document.documentElement.style.setProperty('--ion-safe-area-bottom','24px')");
    await capture('inset-24px', 'catalogo', '.paging button:last-child');
    assert.ok(rows.at(-1).barBottom <= 829 - 24);
    await resize(375, 667);
    await read("document.documentElement.style.setProperty('--ion-safe-area-left','28px')");
    await wait("innerWidth === 375 && innerHeight === 667");
    await capture('inset-28px', 'catalogo', '.paging button:last-child');
    assert.ok(rows.at(-1).barLeft >= 28);
    await go('/products/313', '.product-summary h1');
    await read("document.documentElement.style.setProperty('--ion-safe-area-bottom','24px')");
    await capture('inset-24px', 'detalle', '.purchase-panel cmc-button');
    assert.ok(await read("document.querySelector('ion-content.product-content').getBoundingClientRect().bottom <= innerHeight - 24"));

    await resize(320, 350);
    await go('/register', 'app-connected-register input[type=email]');
    await read("document.documentElement.style.fontSize='200%'");
    await read('document.fonts.ready.then(() => true)');
    await sleep(250);
    await capture('texto-200-ventana-baja', 'registro', '.auth-form button[type=submit]');
  }
  if (!baseline) {
    const theme = await read("['--cmc-cta','--cmc-text-on-primary','--cmc-promo-mamey','--cmc-text-primary','--cmc-primary','--cmc-background'].map(name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim())");
    const luminance = (hex) => hex.slice(1).match(/../g).map((channel) => Number.parseInt(channel, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
    for (let i = 0; i < theme.length; i += 2) {
      const pair = [luminance(theme[i]), luminance(theme[i + 1])].sort((a, b) => b - a);
      assert.ok((pair[0] + 0.05) / (pair[1] + 0.05) >= 4.5, 'insufficient contrast: ' + theme.slice(i, i + 2));
    }
    assert.ok(rows.some((row) => row.screen === 'catalogo' && row.image), 'no image measured in the catalog');
    assert.ok(rows.some((row) => row.screen === 'detalle' && row.image), 'no image measured in product detail');
    assert.deepEqual(errors, [], 'unhandled synthetic HTTP requests');
  }
  console.log(rows.length + ' observations, ' + canceledInterceptions + ' canceled Chrome interceptions, ' +
    errors.length + ' unhandled synthetic HTTP requests');
} finally {
  await writeFile(path.join(out, 'matrix.json'), JSON.stringify({ source: 'Chrome CSS viewport, isolated HTTP fixtures', rows, canceledInterceptions, errors }, null, 2));
  ws?.close();
  chrome.kill();
}
