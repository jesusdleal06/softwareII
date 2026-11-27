import { sleep } from 'k6';
import exec from 'k6/execution';
import { availability, booking, fixture, isStatus, slot, strict, summary } from './common.js';

export const options = { vus: 20, duration: '10m', thresholds: strict };
export const setup = fixture;
export default function (data) {
  const s = slot(data, exec.scenario.iterationInTest, 2);
  isStatus(availability(s), 200);
  isStatus(booking(s), 201);
  sleep(2);
}
export const handleSummary = data => summary('rnf04-02-steady', data);
