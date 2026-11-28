import { expect, type APIRequestContext } from '@playwright/test';
import { addDays, addDaysKey, fromDateKey, toDateKey } from './dates';

export interface DentistDto {
  id: number;
  name: string;
  specialty: string;
}

export interface ProcedureDto {
  id: number;
  name: string;
  durationMinutes: number;
}

export interface AvailabilityDto {
  dentistId: number;
  date: string;
  procedureId: number;
  slots: string[];
}

export interface PublicAppointmentDto {
  id: number;
  code: string;
  dentistId: number;
  dentistName: string;
  procedureId: number;
  procedureName: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: string;
}

export interface ManagedAppointmentDto extends PublicAppointmentDto {
  patientName: string;
  patientPhone: string;
}

export interface StaffAppointmentDto extends PublicAppointmentDto {
  patientId: number;
  patientName: string;
  patientPhone: string;
  origin: 'WEB' | 'MANUAL';
}

export interface LoginResponseDto {
  token: string;
  tokenType: string;
  expiresInSeconds: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'AUXILIAR' | 'ODONTOLOGO';
    active: boolean;
  };
}

export interface ManageLinkDto {
  token: string;
  url: string;
}

export interface PhoneCodeDto {
  code: string;
}

export interface PhoneVerificationDto {
  verificationToken: string;
}

export interface ReportDto {
  from: string;
  to: string;
  dentistId: number | null;
  total: number;
  attended: number;
  cancelled: number;
  noShow: number;
  noShowRate: number;
  daily: Array<{ date: string; total: number }>;
}

export interface SlotTarget {
  dentist: DentistDto;
  procedure: ProcedureDto;
  date: string;
  time: string;
}

export interface Patient {
  name: string;
  phone: string;
}

export const DEMO_AUXILIAR = { email: 'ana@villadent.co', password: 'villadent2024' };
export const DEMO_ODONTOLOGA = { email: 'laura@villadent.co', password: 'villadent2024' };

let uniqueCounter = 0;

export function uniquePhone(prefix = '3009'): string {
  uniqueCounter += 1;
  const random = Math.floor(Math.random() * 1_000_000);
  return `${prefix}${String((random + uniqueCounter) % 1_000_000).padStart(6, '0')}`;
}

export function uniqueName(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix} ${Date.now()}${uniqueCounter}`;
}

function authHeaders(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function loginApi(
  api: APIRequestContext,
  email: string,
  password: string,
): Promise<LoginResponseDto> {
  const response = await api.post('/api/v1/auth/login', { data: { email, password } });
  expect(response.status()).toBe(200);
  return (await response.json()) as LoginResponseDto;
}

export async function getDentists(api: APIRequestContext): Promise<DentistDto[]> {
  const response = await api.get('/api/v1/public/dentists');
  expect(response.status()).toBe(200);
  return (await response.json()) as DentistDto[];
}

export async function getProcedures(api: APIRequestContext): Promise<ProcedureDto[]> {
  const response = await api.get('/api/v1/public/procedures');
  expect(response.status()).toBe(200);
  return (await response.json()) as ProcedureDto[];
}

export async function getAvailability(
  api: APIRequestContext,
  dentistId: number,
  procedureId: number,
  date: string,
): Promise<AvailabilityDto> {
  const response = await api.get('/api/v1/public/availability', {
    params: { dentistId, procedureId, date },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as AvailabilityDto;
}

export async function findSlot(
  api: APIRequestContext,
  options: {
    fromDate?: string;
    preferredTime?: string;
    dentist?: DentistDto;
    procedure?: ProcedureDto;
    exclude?: Set<string>;
    maxDays?: number;
  } = {},
): Promise<SlotTarget> {
  const fromDate = options.fromDate ?? toDateKey(new Date());
  const maxDays = options.maxDays ?? 28;
  const dentists = options.dentist ? [options.dentist] : await getDentists(api);
  const procedures = options.procedure ? [options.procedure] : await getProcedures(api);

  for (let offset = 0; offset < maxDays; offset += 1) {
    const date = toDateKey(addDays(fromDateKey(fromDate), offset));
    for (const dentist of dentists) {
      for (const procedure of procedures) {
        const availability = await getAvailability(api, dentist.id, procedure.id, date);
        const candidates = options.preferredTime
          ? availability.slots.filter((time) => time === options.preferredTime)
          : availability.slots;
        const time = candidates.find(
          (candidate) => !options.exclude?.has(`${date}T${candidate}`),
        );
        if (time) {
          return { dentist, procedure, date, time };
        }
      }
    }
  }

  throw new Error(`No free slot found from ${fromDate}`);
}

export async function findSlotBetween(
  api: APIRequestContext,
  fromDate: string,
  toDate: string,
  exclude: Set<string> = new Set(),
): Promise<SlotTarget> {
  const dentists = await getDentists(api);
  const procedures = await getProcedures(api);

  for (let date = fromDate; date <= toDate; date = addDaysKey(date, 1)) {
    for (const dentist of dentists) {
      for (const procedure of procedures) {
        const availability = await getAvailability(api, dentist.id, procedure.id, date);
        const time = availability.slots.find(
          (candidate) => !exclude.has(`${date}T${candidate}`),
        );
        if (time) {
          return { dentist, procedure, date, time };
        }
      }
    }
  }

  throw new Error(`No free slot found between ${fromDate} and ${toDate}`);
}

export async function findSharedSlot(
  api: APIRequestContext,
  first: DentistDto,
  second: DentistDto,
  time = '10:00',
  maxDays = 28,
): Promise<{ procedure: ProcedureDto; date: string; time: string }> {
  const procedures = await getProcedures(api);
  const fromDate = toDateKey(new Date());

  for (let offset = 0; offset < maxDays; offset += 1) {
    const date = toDateKey(addDays(fromDateKey(fromDate), offset));
    for (const procedure of procedures) {
      const [firstAvailability, secondAvailability] = await Promise.all([
        getAvailability(api, first.id, procedure.id, date),
        getAvailability(api, second.id, procedure.id, date),
      ]);
      if (firstAvailability.slots.includes(time) && secondAvailability.slots.includes(time)) {
        return { procedure, date, time };
      }
    }
  }

  throw new Error(`No shared ${time} slot found`);
}

/** Requests a WhatsApp verification code for the phone (S1). */
export async function requestPhoneCode(api: APIRequestContext, phone: string): Promise<void> {
  const response = await api.post('/api/v1/public/phone-verifications', { data: { phone } });
  expect(response.status()).toBe(202);
}

/** Reads the code the e2e profile captured for the phone (S6, e2e-only endpoint). */
export async function getPhoneCode(api: APIRequestContext, phone: string): Promise<string> {
  const response = await api.get(
    `/api/v1/e2e/phone-verifications/${encodeURIComponent(phone)}/code`,
  );
  expect(response.status()).toBe(200);
  return ((await response.json()) as PhoneCodeDto).code;
}

/** Verifies the code and returns the token the public booking must carry (S3). */
export async function verifyPhoneCode(
  api: APIRequestContext,
  phone: string,
  code: string,
): Promise<string> {
  const response = await api.post('/api/v1/public/phone-verifications/verify', {
    data: { phone, code },
  });
  expect(response.status()).toBe(200);
  return ((await response.json()) as PhoneVerificationDto).verificationToken;
}

/** Requests the code and verifies it in one step, as an API-level booking does. */
export async function verifyPhone(api: APIRequestContext, phone: string): Promise<string> {
  await requestPhoneCode(api, phone);
  return verifyPhoneCode(api, phone, await getPhoneCode(api, phone));
}

export async function bookPublic(
  api: APIRequestContext,
  target: SlotTarget,
  patient: Patient,
): Promise<PublicAppointmentDto> {
  const verificationToken = await verifyPhone(api, patient.phone);
  const response = await api.post('/api/v1/public/appointments', {
    data: {
      patientName: patient.name,
      patientPhone: patient.phone,
      dentistId: target.dentist.id,
      procedureId: target.procedure.id,
      date: target.date,
      time: target.time,
      verificationToken,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as PublicAppointmentDto;
}

export async function bookStaff(
  api: APIRequestContext,
  token: string,
  target: SlotTarget,
  patient: Patient,
): Promise<StaffAppointmentDto> {
  const response = await api.post('/api/v1/appointments', {
    headers: authHeaders(token),
    data: {
      patientName: patient.name,
      patientPhone: patient.phone,
      dentistId: target.dentist.id,
      procedureId: target.procedure.id,
      date: target.date,
      time: target.time,
    },
  });
  expect([200, 201]).toContain(response.status());
  return (await response.json()) as StaffAppointmentDto;
}

export async function patchStatus(
  api: APIRequestContext,
  token: string,
  appointmentId: number,
  status: 'ATENDIDA' | 'CANCELADA' | 'NO_ASISTIO',
): Promise<void> {
  const response = await api.patch(`/api/v1/appointments/${appointmentId}/status`, {
    headers: authHeaders(token),
    data: { status },
  });
  expect(response.status()).toBe(200);
}

export async function issueManageLink(
  api: APIRequestContext,
  appointmentId: number,
): Promise<ManageLinkDto> {
  const response = await api.post(`/api/v1/e2e/appointments/${appointmentId}/manage-link`);
  expect(response.status()).toBe(200);
  return (await response.json()) as ManageLinkDto;
}

export async function getManaged(
  api: APIRequestContext,
  token: string,
): Promise<{ status: number; body: ManagedAppointmentDto | null }> {
  const response = await api.get(
    `/api/v1/public/appointments/manage/${encodeURIComponent(token)}`,
  );
  return {
    status: response.status(),
    body: response.ok() ? ((await response.json()) as ManagedAppointmentDto) : null,
  };
}

export async function getReport(
  api: APIRequestContext,
  token: string,
  from: string,
  to: string,
): Promise<ReportDto> {
  const response = await api.get('/api/v1/reports', {
    headers: authHeaders(token),
    params: { from, to },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as ReportDto;
}

export async function registerDentist(
  api: APIRequestContext,
  token: string,
  name: string,
  specialty: string,
): Promise<DentistDto> {
  const response = await api.post('/api/v1/dentists', {
    headers: authHeaders(token),
    data: { name, specialty },
  });
  expect([200, 201]).toContain(response.status());
  return (await response.json()) as DentistDto;
}

/** Replaces the dentists who perform a procedure (admin catalog). */
export async function setProcedureDentists(
  api: APIRequestContext,
  token: string,
  procedureId: number,
  dentistIds: number[],
): Promise<void> {
  const response = await api.put(`/api/v1/procedures/${procedureId}/dentists`, {
    headers: authHeaders(token),
    data: { dentistIds },
  });
  expect(response.status()).toBe(200);
}
