import { catalog, summary } from './common.js';

export const options = {
  scenarios: {
    progressive: { executor: 'ramping-vus', startVUs: 0,
      stages: [{ duration: '30s', target: 5 }, { duration: '30s', target: 10 }, { duration: '30s', target: 20 }, { duration: '15s', target: 0 }],
      gracefulRampDown: '5s', tags: { phase: 'stress' } },
    recovery: { executor: 'constant-vus', vus: 1, duration: '30s', startTime: '120s', tags: { phase: 'recovery' } },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '20s' }],
    'http_req_duration{phase:recovery}': ['p(95)<1000'],
    'http_req_failed{phase:recovery}': ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
};
export default catalog;
export const handleSummary = summary;
