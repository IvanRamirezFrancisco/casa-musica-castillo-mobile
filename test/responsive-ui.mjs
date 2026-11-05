// Chrome viewport checks against localhost. The browser intercepts HTTP only for this test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = 'http://127.0.0.1:4291';
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
  detailedDescription: null, price: 6500, discountPrice: null, stock: 18,
  imageUrl: index === 0 && !baseline ? fixtureImage : null, images: [], category, brand: null,
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
const cart = { cartId: 9, items: [], totalItems: 0, subtotal: 0, tax: 0, discount: 0,
  total: 0, couponCode: null, canCheckout: false, warningMessage: null };
function fixture(method, pathname) {
  if (pathname === '/api/auth/login' && method === 'POST') return wrap({ jwtResponse: { accessToken, tokenType: 'Bearer', user } });
  if (method !== 'GET') return undefined;
  if (pathname === '/api/auth/me') return user;
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
  const bar = [...document.querySelectorAll('ion-tab-bar')].find(isVisible);
  const modal = document.querySelector('ion-modal.show-modal');
  const content = [...(modal || document).querySelectorAll('ion-content')].filter(isVisible).at(-1);
  const scroll = await content?.getScrollElement?.();
  const last = selector && [...document.querySelectorAll(selector)].filter(isVisible).at(-1);
  // Let Ionic and the browser settle reflow after a viewport or inset change.
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  if (last && scroll) scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'instant' });
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
      pending.set(id, (message) => {
        clearTimeout(timer);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      });
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
    if (data === undefined && request.method !== 'OPTIONS') errors.push(request.method + ' ' + url.pathname);
    await rpc('Fetch.fulfillRequest', {
      requestId, responseCode: request.method === 'OPTIONS' ? 204 : data === undefined ? 404 : 200,
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
    const receiver = pending.get(message.id);
    if (receiver) { pending.delete(message.id); receiver(message); }
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
      assert.ok(geometry.targetBottom <= geometry.scrollBottom + 1, label + ' ' + screen + ': last control unreachable');
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
    await click('.catalog-controls button');
    await wait("!!document.querySelector('ion-modal.show-modal .sheet-actions')");
    await capture(label, 'filtros', '.sheet-actions button:last-child');
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
    await go('/products/313', '.product-summary h1');
    await capture(label, 'detalle');
    await go('/main/home', 'app-public-home .store-hero');
    await capture(label, 'inicio');
    await go('/login', 'app-connected-login input[type=email]');
    await capture(label, 'login');
    if (!baseline) {
      for (const [type, value] of [['email', user.email], ['password', 'Only-Local-Layout-123']]) {
        await read(find('app-connected-login input[type=' + type + ']') + '.focus()');
        await rpc('Input.insertText', { text: value });
      }
      await read(find('app-connected-login form.auth-form') + '.requestSubmit()');
      await wait("location.pathname==='/main/home'");
      for (const [tab, view] of [['cart', 'app-connected-cart'], ['orders', 'app-connected-orders'], ['profile', 'app-connected-profile-view']]) {
        await click('ion-tab-button[tab=' + tab + ']');
        await wait('location.pathname===' + JSON.stringify('/main/' + tab) + ' && !!' + find(view + ' ion-content'));
        await capture(label, tab, view + ' main button, ' + view + ' main a');
      }
    }
    await go('/register', 'app-connected-register input[type=email]');
    await capture(label, 'registro');
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
    await resize(320, 350);
    await go('/register', 'app-connected-register input[type=email]');
    await read("document.documentElement.style.fontSize='200%'");
    await capture('texto-200-ventana-baja', 'registro', '.auth-form cmc-button[type=submit]');
  }
  if (!baseline) {
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
