// Exploratory companion of CP-RNF04-03: the plan's ramp (20 -> 200 users in 5 min)
// never crossed 2 s, so this run keeps ramping (default up to 1,000 users in 10 min)
// to locate the actual limit. Same requests and 10-second windows as the plan case.
import { sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Trend } from 'k6/metrics';
import { availability, booking, controlled, fixture, isStatus, slot, summary } from './common.js';

const MAX_VUS = Number(__ENV.RAMP_MAX_VUS || 1000);
const RAMP_MINUTES = Number(__ENV.RAMP_MINUTES || 10);
const WINDOWS = RAMP_MINUTES * 6;
const windows = Array.from({ length: WINDOWS }, (_, i) => new Trend(`ramp_window_${i + 1}`, true));
const recovery = new Trend('recovery_ms', true);
const recoverySamples = new Counter('recovery_samples');
export const options = {
  scenarios: {
    ramp: { executor: 'ramping-vus', startVUs: 20, stages: [{ duration: `${RAMP_MINUTES}m`, target: MAX_VUS }], gracefulRampDown: '0s', gracefulStop: '10s' },
    cooldown: { executor: 'constant-vus', vus: 1, startTime: `${RAMP_MINUTES}m`, duration: '1m', exec: 'cooldown' },
    recovery: { executor: 'per-vu-iterations', vus: 1, iterations: 1, startTime: `${RAMP_MINUTES + 1}m`, exec: 'probe' },
  },
  thresholds: { recovery_ms: ['max<2000'], recovery_samples: ['count==1'], 'checks{scenario:recovery}': ['rate==1'] },
};
export function setup() {
  const data = fixture();
  data.start += 364 * 86400000;
  return data;
}
export default function (data) {
  const s = slot(data, exec.scenario.iterationInTest, 3);
  const record = (request, expected) => {
    const index = Math.min(WINDOWS - 1, Math.floor((Date.now() - exec.scenario.startTime) / 10000));
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
  return summary('rnf04-03-ramp-explore', data, {
    max_vus: MAX_VUS, ramp_minutes: RAMP_MINUTES,
    window_width_s: 10, window_p95_ms: p95,
    first_crossing_s: index < 0 ? null : [index * 10, (index + 1) * 10],
    vus_at_crossing: index < 0 ? null : Math.round(20 + ((MAX_VUS - 20) * (index * 10)) / (RAMP_MINUTES * 60)),
    recovery_ms: data.metrics.recovery_ms?.values.max,
    unexpected_rate: data.metrics.unexpected_response?.values.rate,
    controlled_errors: data.metrics.controlled_errors?.values.count,
  });
};
