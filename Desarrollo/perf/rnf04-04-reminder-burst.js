import http from 'k6/http';
import exec from 'k6/execution';
import { sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { api, booking, fixture, isStatus, slot, strict, summary, web } from './common.js';

const confirmations = new Counter('confirmations');
export const options = {
  scenarios: { burst: { executor: 'ramping-vus', startVUs: 1, stages: [{ duration: '10s', target: 45 }, { duration: '1s', target: 45 }] } },
  thresholds: {
    'checks{scenario:burst}': strict.checks,
    'http_req_failed{scenario:burst}': strict.http_req_failed,
    'http_req_duration{scenario:burst}': strict.http_req_duration,
    confirmations: ['count==45'],
  },
};

export function setup() {
  const data = fixture();
  // Use dates distinct from the load cases.
  data.start += 1456 * 86400000;
  return Array.from({ length: 45 }, (_, i) => {
    const r = booking(slot(data, i, 4));
    if (r.status !== 201) throw new Error(`Setup booking failed: ${r.status}`);
    const link = http.post(`${api}/e2e/appointments/${r.json('id')}/manage-link`);
    if (link.status !== 200) throw new Error(`Setup manage link failed: ${link.status}`);
    return link.json('token');
  });
}
export default function (tokens) {
  if (exec.vu.iterationInScenario === 0) {
    const token = tokens[exec.vu.idInTest - 1];
    const path = `${api}/public/appointments/manage/${token}`;
    isStatus(http.get(`${web}/cita/${token}`, { tags: { name: 'manage page' } }), 200);
    isStatus(http.get(path, { tags: { name: 'manage appointment' } }), 200);
    const r = http.post(path + '/confirm', null, { tags: { name: 'confirm appointment' } });
    confirmations.add(Number(isStatus(r, 200) && r.json('status') === 'CONFIRMADA'));
  }
  sleep(1);
}
export const handleSummary = data => summary('rnf04-04-reminder-burst', data, {
  burst_p95_ms: data.metrics['http_req_duration{scenario:burst}']?.values['p(95)'],
  burst_failed_rate: data.metrics['http_req_failed{scenario:burst}']?.values.rate,
  confirmations: data.metrics.confirmations?.values.count,
});
