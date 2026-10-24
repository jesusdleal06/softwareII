import { Appointment } from '../models';

/** Builds an appointment fixture for specs; only overrides matter. */
export function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'x1',
    code: 'VD-2000',
    dentistId: 'd1',
    procedureId: 'p1',
    date: '2026-10-15',
    time: '08:00',
    patientName: 'Paciente Prueba',
    patientPhone: '3000000000',
    durationMinutes: 30,
    dentistName: 'Dra. Laura Villamizar',
    procedureName: 'Limpieza',
    status: 'Pendiente',
    reminder: 'Programado',
    origin: 'Web',
    ...overrides,
  };
}
