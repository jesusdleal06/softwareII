import { sleep } from 'k6';
import exec from 'k6/execution';
import { Trend } from 'k6/metrics';
import { availability, fixture, isStatus, slot, summary } from './common.js';

const duration = __ENV.SOAK_DURATION || '2h';
const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(duration);
if (!parts) throw new Error('SOAK_DURATION must use hours, minutes, and/or seconds');
const seconds = (+parts[1] || 0) * 3600 + (+parts[2] || 0) * 60 + (+parts[3] || 0);
if (!seconds) throw new Error('SOAK_DURATION must be positive');
const windows = Array.from({ length: Math.ceil(seconds / 600) }, (_, i) => new Trend(`soak_window_${i + 1}`, true));
export const options = { vus: 5, duration, thresholds: { checks: ['rate==1'], http_req_failed: ['rate==0'] } };
export const setup = fixture;
export default function (data) {
  const index = Math.min(windows.length - 1, Math.floor((Date.now() - exec.scenario.startTime) / 600000));
  const response = availability(slot(data, exec.scenario.iterationInTest % 48, 6));
  windows[index].add(response.timings.duration);
  isStatus(response, 200);
  sleep(2);
}
export const handleSummary = data => {
  const p95 = windows.map((_, i) => data.metrics[`soak_window_${i + 1}`]?.values['p(95)'] ?? null);
  const ratio = p95[0] > 0 && p95.at(-1) !== null ? p95.at(-1) / p95[0] : null;
  const full = seconds === 7200;
  return summary('rnf04-06-soak', data, {
    duration, full_test: full, window_p95_ms: p95, last_to_first_ratio: full ? ratio : null,
    latency_pass: full ? p95.every(p => p !== null) && ratio !== null && ratio <= 1.2 : null,
  });
};
