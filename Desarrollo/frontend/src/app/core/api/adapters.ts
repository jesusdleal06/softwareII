import {
  Appointment,
  AppointmentOrigin,
  AppointmentStatus,
  Dentist,
  Procedure,
  ReminderStatus,
  Role,
} from '../models';
import {
  ApiOrigin,
  ApiStatus,
  DentistDto,
  ManagedAppointmentDto,
  ProcedureDto,
  PublicAppointmentDto,
  StaffAppointmentDto,
} from './api.types';

const STATUS: Record<ApiStatus, AppointmentStatus> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REPROGRAMADA: 'Reprogramada',
  ATENDIDA: 'Atendida',
  NO_ASISTIO: 'No asistió',
};

const ORIGIN: Record<ApiOrigin, AppointmentOrigin> = {
  WEB: 'Web',
  MANUAL: 'Manual',
};

export function mapRole(role: 'AUXILIAR' | 'ODONTOLOGO'): Role {
  return role === 'ODONTOLOGO' ? 'Odontóloga' : 'Auxiliar administrativa';
}

export function mapDentist(dto: DentistDto): Dentist {
  return {
    id: String(dto.id),
    name: dto.name,
    specialty: dto.specialty,
    description: dto.specialty,
    initials: initials(dto.name),
  };
}

export function mapProcedure(dto: ProcedureDto): Procedure {
  return { id: String(dto.id), name: dto.name, durationMinutes: dto.durationMinutes };
}

export function mapStaffAppointment(dto: StaffAppointmentDto): Appointment {
  return {
    id: String(dto.id),
    code: dto.code,
    dentistId: String(dto.dentistId),
    procedureId: String(dto.procedureId),
    date: dto.date,
    time: dto.time,
    patientName: dto.patientName,
    patientPhone: dto.patientPhone,
    durationMinutes: dto.durationMinutes,
    dentistName: dto.dentistName,
    procedureName: dto.procedureName,
    status: STATUS[dto.status],
    reminder: mapReminder(dto.reminderStatus),
    origin: ORIGIN[dto.origin],
  };
}

export function mapPublicAppointment(
  dto: PublicAppointmentDto,
  patientName: string,
  patientPhone: string,
): Appointment {
  return {
    id: String(dto.id),
    code: dto.code,
    dentistId: String(dto.dentistId),
    procedureId: String(dto.procedureId),
    date: dto.date,
    time: dto.time,
    patientName,
    patientPhone,
    durationMinutes: dto.durationMinutes,
    dentistName: dto.dentistName,
    procedureName: dto.procedureName,
    status: STATUS[dto.status],
    reminder: 'Programado',
    origin: 'Web',
  };
}

export function mapManagedAppointment(dto: ManagedAppointmentDto): Appointment {
  const status = STATUS[dto.status];
  const active = status === 'Pendiente' || status === 'Confirmada' || status === 'Reprogramada';
  return {
    id: String(dto.id),
    code: dto.code,
    dentistId: String(dto.dentistId),
    procedureId: String(dto.procedureId),
    date: dto.date,
    time: dto.time,
    patientName: dto.patientName,
    patientPhone: dto.patientPhone,
    durationMinutes: dto.durationMinutes,
    dentistName: dto.dentistName,
    procedureName: dto.procedureName,
    status,
    reminder: active ? 'Programado' : 'Cancelado',
    origin: 'Web',
  };
}

function mapReminder(status: StaffAppointmentDto['reminderStatus']): ReminderStatus {
  if (status === 'ENVIADO') return 'Enviado';
  if (status === 'PROGRAMADO') return 'Programado';
  if (status === 'CANCELADO') return 'Cancelado';
  return 'Falló';
}

function initials(name: string): string {
  return name
    .replace(/^Dra?\.\s*/, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}
