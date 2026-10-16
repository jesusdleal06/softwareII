import { DENTISTS, PROCEDURES } from '../data/mock-data';
import { Appointment, Dentist, Procedure } from '../models';
import { toMinutes } from './time';

const DEFAULT_DURATION_MINUTES = 30;

export function dentistById(id: string): Dentist | undefined {
  return DENTISTS.find((d) => d.id === id);
}

export function procedureById(id: string): Procedure | undefined {
  return PROCEDURES.find((p) => p.id === id);
}

export function durationOf(appointment: Pick<Appointment, 'procedureId'>): number {
  return procedureById(appointment.procedureId)?.durationMinutes ?? DEFAULT_DURATION_MINUTES;
}

/** End of the appointment in minutes from midnight. */
export function endOf(appointment: Pick<Appointment, 'time' | 'procedureId'>): number {
  return toMinutes(appointment.time) + durationOf(appointment);
}
