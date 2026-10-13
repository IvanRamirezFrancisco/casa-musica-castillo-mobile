import { catalog, summary } from './common.js';

export const options = {
  scenarios: { normal: { executor: 'ramping-vus', startVUs: 0,
    stages: [{ duration: '15s', target: 2 }, { duration: '60s', target: 5 }, { duration: '15s', target: 0 }],
    gracefulRampDown: '10s' } },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(90)<800', 'p(95)<1000'], checks: ['rate>0.99'] },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
};
export default catalog;
export const handleSummary = summary;
