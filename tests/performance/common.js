import http from 'k6/http';
import { check, sleep } from 'k6';

const base = (__ENV.K6_BASE_URL || '').replace(/\/$/, '');
const origin = base.match(/^(https?:\/\/[^/]+)/)?.[1];
if (!origin || origin !== __ENV.K6_AUTHORIZED_ORIGIN || __ENV.K6_TEST_AUTHORIZED !== 'true' ||
  !/^https:\/\/[^@?#]+$/.test(base)) {
  throw new Error('BLOCKED: explicit authorized HTTPS non-production K6_BASE_URL and matching K6_AUTHORIZED_ORIGIN required.');
}

export function catalog() {
  const response = http.get(`${base}/api/public/products/catalog?page=0&size=12`, {
    redirects: 0, timeout: '10s', tags: { endpoint: 'catalog', hu: 'HU05-HU06' },
  });
  check(response, { 'catalog HTTP 200': (r) => r.status === 200 });
  sleep(1);
}

export function summary(data) {
  // Aggregate metrics only, never response bodies or credentials.
  return { 'reports/k6-summary.json': JSON.stringify(data, null, 2) };
}
