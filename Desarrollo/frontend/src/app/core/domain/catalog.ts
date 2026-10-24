import { Appointment, Dentist, Procedure } from '../models';
import { toMinutes } from './time';

export function dentistById(id: string, dentists: readonly Dentist[]): Dentist | undefined {
  return dentists.find((d) => d.id === id);
}

export function procedureById(id: string, procedures: readonly Procedure[]): Procedure | undefined {
  return procedures.find((p) => p.id === id);
}

export function durationOf(appointment: Pick<Appointment, 'durationMinutes'>): number {
  return appointment.durationMinutes;
}

/** End of the appointment in minutes from midnight. */
export function endOf(appointment: Pick<Appointment, 'time' | 'durationMinutes'>): number {
  return toMinutes(appointment.time) + durationOf(appointment);
}
