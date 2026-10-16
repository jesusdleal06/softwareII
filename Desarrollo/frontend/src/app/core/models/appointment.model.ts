/** Appointment status. Values are the Spanish labels shown in the UI. */
export type AppointmentStatus =
  'Pendiente' | 'Confirmada' | 'Cancelada' | 'Reprogramada' | 'Atendida' | 'No asistió';

/** WhatsApp reminder status. Values are the Spanish labels shown in the UI. */
export type ReminderStatus = 'Programado' | 'Enviado' | 'Falló';

export type AppointmentOrigin = 'Web' | 'Manual';

export interface Appointment {
  id: string;
  /** Public code, e.g. `VD-1041`. */
  code: string;
  dentistId: string;
  procedureId: string;
  /** Local date key `yyyy-mm-dd`. */
  date: string;
  /** Start time `HH:MM` (24 h). */
  time: string;
  patientName: string;
  patientPhone: string;
  status: AppointmentStatus;
  reminder: ReminderStatus;
  origin: AppointmentOrigin;
}

export type NewAppointmentInput = Pick<
  Appointment,
  'dentistId' | 'procedureId' | 'date' | 'time' | 'patientName' | 'patientPhone' | 'origin'
>;

export type CreateAppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: 'conflicto' }
  | { ok: false; reason: 'cita-activa'; activeAppointment: Appointment };

export type RescheduleAppointmentResult =
  { ok: true; appointment: Appointment } | { ok: false; reason: 'conflicto' };
