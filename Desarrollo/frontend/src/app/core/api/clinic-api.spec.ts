import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from './api-error';
import { ClinicApi } from './clinic-api';

const booking = { patientName: 'Ana Pérez', patientPhone: '3009998877', dentistId: 1, procedureId: 1, date: '2026-10-26', time: '10:00' };
const range = { from: '2026-10-26', to: '2026-10-31' };
const profile = {
  firstName: 'Laura',
  secondName: null,
  firstSurname: 'Villamizar',
  secondSurname: null,
  academicTitles: ['Ortodoncia'],
  description: 'Odontóloga especialista en ortodoncia.',
};

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
    ['GET', '/api/v1/reports/history', (a) => a.reportHistory()],
    ['GET', '/api/v1/reports/history/7/pdf', (a) => a.downloadReportPdf(7, '2026-10-01', '2026-10-31')],
    ['GET', '/api/v1/dentists/me/profile', (a) => a.dentistProfile()],
    ['PUT', '/api/v1/dentists/me/profile', (a) => a.saveDentistProfile(profile)],
    ['PUT', '/api/v1/dentists/me/photo', (a) => a.uploadDentistPhoto(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))],
  ];

  it.each(staffCalls)('sends the staff token on %s %s', async (method, url, call) => {
    const pending = call(api);
    const request = http.expectOne((r) => r.url === url);
    expect(request.request.method).toBe(method);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-staff');
    request.flush(url.endsWith('/export') || url.endsWith('/pdf') ? new Blob(['a']) : {});
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

  it('requests the report export as a PDF when format is pdf', async () => {
    const pending = api.exportReport({ ...range, format: 'pdf' });
    const request = http.expectOne((r) => r.url === '/api/v1/reports/export');
    expect(request.request.params.get('from')).toBe('2026-10-26');
    expect(request.request.params.get('to')).toBe('2026-10-31');
    expect(request.request.params.get('format')).toBe('pdf');
    request.flush(new Blob(['%PDF'], { type: 'application/pdf' }), {
      headers: { 'Content-Disposition': 'attachment; filename="reporte-2026-10-26-2026-10-31.pdf"' },
    });
    await expect(pending).resolves.toMatchObject({ filename: 'reporte-2026-10-26-2026-10-31.pdf' });
  });

  it('leaves the CSV export unchanged when no format is requested', async () => {
    const pending = api.exportReport(range);
    const request = http.expectOne((r) => r.url === '/api/v1/reports/export');
    expect(request.request.params.has('format')).toBe(false);
    request.flush(new Blob(['a,b']), {
      headers: { 'Content-Disposition': 'attachment; filename="reporte-2026-10-26-2026-10-31.csv"' },
    });
    await expect(pending).resolves.toMatchObject({ filename: 'reporte-2026-10-26-2026-10-31.csv' });
  });

  it('downloads a generated report PDF from its history entry', async () => {
    const pending = api.downloadReportPdf(7, '2026-10-01', '2026-10-31');
    const request = http.expectOne('/api/v1/reports/history/7/pdf');
    request.flush(new Blob(['%PDF'], { type: 'application/pdf' }), {
      headers: { 'Content-Disposition': 'attachment; filename="reporte-2026-10-01-2026-10-31.pdf"' },
    });
    await expect(pending).resolves.toMatchObject({ filename: 'reporte-2026-10-01-2026-10-31.pdf' });
  });

  it('uploads the profile photo as multipart with the photo part', async () => {
    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    const pending = api.uploadDentistPhoto(file);
    const request = http.expectOne('/api/v1/dentists/me/photo');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect((request.request.body as FormData).get('photo')).toBe(file);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-staff');
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
