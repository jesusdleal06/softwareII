import { sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Trend } from 'k6/metrics';
import { availability, booking, controlled, fixture, isStatus, slot, summary } from './common.js';

const windows = Array.from({ length: 30 }, (_, i) => new Trend(`ramp_window_${i + 1}`, true));
const recovery = new Trend('recovery_ms', true);
const recoverySamples = new Counter('recovery_samples');
export const options = {
  scenarios: {
    ramp: { executor: 'ramping-vus', startVUs: 20, stages: [{ duration: '5m', target: 200 }], gracefulRampDown: '0s', gracefulStop: '10s' },
    cooldown: { executor: 'constant-vus', vus: 1, startTime: '5m', duration: '1m', exec: 'cooldown' },
    recovery: { executor: 'per-vu-iterations', vus: 1, iterations: 1, startTime: '6m', exec: 'probe' },
  },
  thresholds: { unexpected_response: ['rate==0'], recovery_ms: ['max<2000'], recovery_samples: ['count==1'], 'checks{scenario:recovery}': ['rate==1'] },
};
export function setup() {
  const data = fixture();
  data.start += 364 * 86400000;
  return data;
}
export default function (data) {
  const s = slot(data, exec.scenario.iterationInTest, 3);
  const record = (request, expected) => {
    const index = Math.min(29, Math.floor((Date.now() - exec.scenario.startTime) / 10000));
    const r = request(s);
    windows[index].add(r.timings.duration);
    return controlled(r, expected);
  };
  if (record(availability, 200)) record(booking, 201);
  sleep(2);
}
export function cooldown(data) {
  availability(slot(data, 0, 3));
  sleep(5);
}
export function probe(data) {
  const r = availability(slot(data, 0, 3));
  recovery.add(r.timings.duration);
  recoverySamples.add(1);
  isStatus(r, 200);
}
export const handleSummary = data => {
  const p95 = windows.map((_, i) => data.metrics[`ramp_window_${i + 1}`]?.values['p(95)'] ?? null);
  const index = p95.findIndex(p => p > 2000);
  return summary('rnf04-03-ramp', data, {
    window_width_s: 10, window_p95_ms: p95,
    first_crossing_s: index < 0 ? null : [index * 10, (index + 1) * 10],
    recovery_ms: data.metrics.recovery_ms?.values.max,
    unexpected_rate: data.metrics.unexpected_response?.values.rate,
    controlled_errors: data.metrics.controlled_errors?.values.count,
  });
};
