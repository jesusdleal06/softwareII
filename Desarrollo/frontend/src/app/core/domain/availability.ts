import { SHIFTS } from '../config/clinic';
import { Appointment, AppointmentStatus } from '../models';
import { endOf } from './catalog';
import { SLOT_INTERVAL_MINUTES } from './constants';
import { fromDateKey, toDateKey } from './dates';
import { toHhmm, toMinutes } from './time';

/** Statuses that occupy a slot and count as the patient's active appointment. */
export const ACTIVE_STATUSES: readonly AppointmentStatus[] = [
  'Pendiente',
  'Confirmada',
  'Reprogramada',
];

export function isActiveStatus(status: AppointmentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** Monday to Saturday. */
export function isWorkingDay(dateKey: string): boolean {
  return fromDateKey(dateKey).getDay() !== 0;
}

export function isPastDate(dateKey: string, now: Date): boolean {
  return dateKey < toDateKey(now);
}

export interface SlotQuery {
  dentistId: string;
  date: string;
  durationMinutes: number;
  appointments: readonly Appointment[];
  now: Date;
  /** Appointment being rescheduled: its own slot does not count as busy. */
  excludeAppointmentId?: string;
}

/**
 * Start times (`HH:MM`) where the whole procedure fits inside a shift without
 * overlapping another active appointment of the SAME dentist. Each dentist has
 * an independent agenda. Sundays, past dates and already-started times today
 * offer nothing.
 */
export function availableSlots(query: SlotQuery): string[] {
  const { dentistId, date, durationMinutes, appointments, now, excludeAppointmentId } = query;
  if (!isWorkingDay(date) || isPastDate(date, now)) return [];

  const busy = appointments.filter(
    (a) =>
      a.dentistId === dentistId &&
      a.date === date &&
      a.id !== excludeAppointmentId &&
      isActiveStatus(a.status),
  );

  const isToday = date === toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const free: string[] = [];
  for (const shift of SHIFTS) {
    for (
      let start = shift.start;
      start + durationMinutes <= shift.end;
      start += SLOT_INTERVAL_MINUTES
    ) {
      if (isToday && start <= nowMinutes) continue;
      const end = start + durationMinutes;
      const overlaps = busy.some((a) => start < endOf(a) && end > toMinutes(a.time));
      if (!overlaps) free.push(toHhmm(start));
    }
  }
  return free;
}

export function isSlotAvailable(query: SlotQuery & { time: string }): boolean {
  return availableSlots(query).includes(query.time);
}
