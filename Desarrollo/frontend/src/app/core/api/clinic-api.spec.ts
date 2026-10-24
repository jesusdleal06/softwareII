import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from './api-error';
import { ClinicApi } from './clinic-api';

const booking = { patientName: 'Ana Pérez', patientPhone: '3009998877', dentistId: 1, procedureId: 1, date: '2026-10-26', time: '10:00' };
const range = { from: '2026-10-26', to: '2026-10-31' };

describe('ClinicApi', () => {
  let api: ClinicApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ClinicApi);
    http = TestBed.inject(HttpTestingController);
    api.setToken('jwt-staff');
  });

  afterEach(() => http.verify());

  // Every staff endpoint answers 401 without the token (CP-RF09-04), so each call must send it.
  const staffCalls: [string, string, (a: ClinicApi) => Promise<unknown>][] = [
    ['GET', '/api/v1/dentists', (a) => a.staffDentists()],
    ['GET', '/api/v1/appointments', (a) => a.agenda('2026-10-26')],
    ['POST', '/api/v1/appointments', (a) => a.bookStaff(booking)],
    ['PATCH', '/api/v1/appointments/7/status', (a) => a.changeStatus('7', 'CONFIRMADA')],
    ['PATCH', '/api/v1/appointments/7/reschedule', (a) => a.rescheduleStaff('7', '2026-10-27', '09:00')],
    ['GET', '/api/v1/reports', (a) => a.report(range)],
    ['GET', '/api/v1/reports/export', (a) => a.exportReport(range)],
  ];

  it.each(staffCalls)('sends the staff token on %s %s', async (method, url, call) => {
    const pending = call(api);
    const request = http.expectOne((r) => r.url === url);
    expect(request.request.method).toBe(method);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-staff');
    request.flush(url.endsWith('/export') ? new Blob(['a']) : {});
    await pending;
  });

  // Public endpoints never carry the staff token, even when a staff member is signed in.
  const publicCalls: [string, string, (a: ClinicApi) => Promise<unknown>][] = [
    ['POST', '/api/v1/auth/login', (a) => a.login('ana@villadent.co', 'secret')],
    ['GET', '/api/v1/public/dentists', (a) => a.dentists()],
    ['GET', '/api/v1/public/procedures', (a) => a.procedures()],
    ['GET', '/api/v1/public/availability', (a) => a.availability('1', '1', '2026-10-26')],
    ['POST', '/api/v1/public/appointments', (a) => a.bookPublic(booking)],
    ['GET', '/api/v1/public/appointments/manage/abc', (a) => a.managed('abc')],
    ['POST', '/api/v1/public/appointments/manage/abc/confirm', (a) => a.confirmManaged('abc')],
    ['POST', '/api/v1/public/appointments/manage/abc/cancel', (a) => a.cancelManaged('abc')],
    ['POST', '/api/v1/public/appointments/manage/abc/reschedule', (a) => a.rescheduleManaged('abc', '2026-10-27', '09:00')],
  ];

  it.each(publicCalls)('does not send the staff token on %s %s', async (method, url, call) => {
    const pending = call(api);
    const request = http.expectOne((r) => r.url === url);
    expect(request.request.method).toBe(method);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
    await pending;
  });

  it('turns a problem detail into an ApiError with the backend code and message', async () => {
    const pending = api.bookPublic(booking);
    http.expectOne('/api/v1/public/appointments').flush(
      { code: 'SLOT_TAKEN', detail: 'Este horario acaba de ser ocupado. Por favor elige otro.' },
      { status: 409, statusText: 'Conflict' },
    );
    await expect(pending).rejects.toEqual(
      new ApiError(409, 'SLOT_TAKEN', 'Este horario acaba de ser ocupado. Por favor elige otro.'),
    );
  });
});
