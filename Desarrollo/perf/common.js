import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';

export const api = 'http://127.0.0.1:8092/api/v1';
export const web = 'http://127.0.0.1:4292';
const created = new Counter('bookings_created');
const controlledErrors = new Counter('controlled_errors');
export const rejected = new Rate('unexpected_response');
export const strict = { checks: ['rate==1'], http_req_failed: ['rate==0'], http_req_duration: ['p(95)<2000'] };
export const json = { headers: { 'Content-Type': 'application/json' } };
export const isStatus = (response, status) => check(response, { [`HTTP ${status}`]: r => r.status === status });

export function fixture() {
  const dentists = http.get(api + '/public/dentists').json();
  const procedure = http.get(api + '/public/procedures').json().find(p => p.durationMinutes === 30);
  if (!dentists.length || !procedure) throw new Error('Demo fixtures missing');
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 28);
  while (start.getUTCDay() !== 1) start.setUTCDate(start.getUTCDate() + 1);
  return { dentists: dentists.map(d => d.id), procedureId: procedure.id, start: start.getTime() };
}

export function slot(data, index, group) {
  const capacity = 16 * data.dentists.length;
  const day = Math.floor(index / capacity);
  const date = new Date(data.start + (day + 2 * Math.floor(day / 5)) * 86400000).toISOString().slice(0, 10);
  const s = index % 16;
  const hour = (s < 8 ? 8 : 14) + Math.floor((s % 8) / 2);
  return {
    dentistId: data.dentists[Math.floor(index / 16) % data.dentists.length],
    date, procedureId: data.procedureId, time: `${String(hour).padStart(2, '0')}:${s % 2 ? '30' : '00'}`,
    patientName: `Synthetic ${group} ${index}`, patientPhone: `300${group}${String(index).padStart(6, '0')}`,
  };
}

export function availability(s) {
  return http.get(`${api}/public/availability?dentistId=${s.dentistId}&date=${s.date}&procedureId=${s.procedureId}`, { tags: { name: 'availability' } });
}

export function booking(s) {
  const r = http.post(api + '/public/appointments', JSON.stringify(s), json);
  created.add(Number(r.status === 201));
  return r;
}

export function controlled(response, expected) {
  let problem = false;
  if ([409, 429, 503].includes(response.status)) {
    try { problem = response.json('status') === response.status && !!response.json('detail'); } catch (_) { /* Not a problem document. */ }
  }
  controlledErrors.add(Number(problem), { status: String(response.status) });
  rejected.add(response.status !== expected && !problem);
  return response.status === expected;
}

export function summary(stem, data, details = {}) {
  const lines = Object.entries({
    requests: data.metrics.http_reqs?.values.count,
    p95_ms: data.metrics.http_req_duration?.values['p(95)'],
    failed_rate: data.metrics.http_req_failed?.values.rate,
    bookings_created: data.metrics.bookings_created?.values.count,
    ...details,
  }).map(([key, value]) => `${key}: ${JSON.stringify(value ?? null)}`).join('\n') + '\n';
  return { stdout: lines, [`/evidence/${stem}.txt`]: lines, [`/evidence/${stem}.json`]: JSON.stringify({ ...data, details }, null, 2) + '\n' };
}
