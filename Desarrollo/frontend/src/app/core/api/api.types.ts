/** Wire shapes returned by the Spring Boot API. IDs arrive as numbers. */

export type ApiRole = 'AUXILIAR' | 'ODONTOLOGO';
export type ApiStatus =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'REPROGRAMADA'
  | 'ATENDIDA'
  | 'NO_ASISTIO';
export type ApiOrigin = 'WEB' | 'MANUAL';

export interface LoginResponseDto {
  token: string;
  tokenType: string;
  expiresInSeconds: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: ApiRole;
    active: boolean;
  };
}

/** GET /api/v1/public/dentists: the backend lists active dentists only. */
export interface DentistDto {
  id: number;
  name: string;
  specialty: string;
  photoUrl: string | null;
  academicTitles: string[];
  description: string | null;
}

/** GET/PUT /api/v1/dentists/me/profile. Absent optional values arrive as null. */
export interface DentistProfileDto {
  id: number;
  firstName: string;
  secondName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  fullName: string;
  specialty: string;
  photoUrl: string | null;
  academicTitles: string[];
  description: string;
}

/** PUT /api/v1/dentists/me/profile body. */
export interface DentistProfilePayload {
  firstName: string;
  secondName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  academicTitles: string[];
  description: string;
}

/** GET /api/v1/dentists (staff): adds the linked staff user and the active flag. */
export interface StaffDentistDto extends DentistDto {
  userId: number | null;
  active: boolean;
}

/** GET /api/v1/public/procedures: the backend lists active procedures only. */
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
  status: ApiStatus;
}

export interface ManagedAppointmentDto {
  id: number;
  code: string;
  dentistId: number;
  procedureId: number;
  patientName: string;
  patientPhone: string;
  dentistName: string;
  procedureName: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: ApiStatus;
}

export interface StaffAppointmentDto {
  id: number;
  code: string;
  patientId: number;
  patientName: string;
  patientPhone: string;
  dentistId: number;
  dentistName: string;
  procedureId: number;
  procedureName: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: ApiStatus;
  origin: ApiOrigin;
  reminderStatus: 'PROGRAMADO' | 'ENVIADO' | 'FALLIDO' | 'CANCELADO' | null;
  reminderAttempts: number;
}

export interface ReportCountsDto {
  pending: number;
  confirmed: number;
  rescheduled: number;
  cancelled: number;
  attended: number;
  noShow: number;
}

export interface DailyReportDto {
  date: string;
  total: number;
  counts: ReportCountsDto;
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
  daily: DailyReportDto[];
}

export interface ReportHistoryDto {
  id: number;
  from: string;
  to: string;
  dentistId: number | null;
  dentistName: string | null;
  generatedAt: string;
  generatedBy: string;
}

export interface ProblemDetailDto {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
}
