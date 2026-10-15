import { Appointment, AppointmentStatus } from '../models';
import { addDays, fromDateKey, mondayOf, toDateKey } from './dates';

/** Quick ranges offered by the reports screen. */
export type ReportShortcut = 'hoy' | 'semana' | 'mes' | '30';

export interface ReportFilter {
  from: string;
  to: string;
  /** Empty or undefined means every dentist. */
  dentistId?: string;
}

export interface ReportMetrics {
  total: number;
  attended: number;
  cancelled: number;
  noShow: number;
  /** Rounded percentage of no-shows over finished (attended + no-show) appointments. */
  noShowRate: number;
}

export interface DailyBreakdown {
  date: string;
  total: number;
  counts: Record<AppointmentStatus, number>;
}

const MAX_REPORT_DAYS = 62;
const ALL_STATUSES: readonly AppointmentStatus[] = [
  'Pendiente',
  'Confirmada',
  'Cancelada',
  'Reprogramada',
  'Atendida',
  'No asistió',
];

/** `[from, to]` date keys for a quick range relative to `now`. */
export function reportRange(shortcut: ReportShortcut, now: Date): [string, string] {
  switch (shortcut) {
    case 'hoy':
      return [toDateKey(now), toDateKey(now)];
    case 'semana': {
      const monday = mondayOf(now);
      return [toDateKey(monday), toDateKey(addDays(monday, 5))];
    }
    case 'mes': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return [toDateKey(start), toDateKey(end)];
    }
    case '30':
      return [toDateKey(addDays(now, -29)), toDateKey(now)];
  }
}

export function filterForReport(
  appointments: readonly Appointment[],
  filter: ReportFilter,
): Appointment[] {
  const { from, to, dentistId } = filter;
  return appointments.filter(
    (a) => a.date >= from && a.date <= to && (!dentistId || a.dentistId === dentistId),
  );
}

export function computeReportMetrics(appointments: readonly Appointment[]): ReportMetrics {
  const count = (status: AppointmentStatus) =>
    appointments.filter((a) => a.status === status).length;
  const attended = count('Atendida');
  const cancelled = count('Cancelada');
  const noShow = count('No asistió');
  const finished = attended + noShow;
  return {
    total: appointments.length,
    attended,
    cancelled,
    noShow,
    noShowRate: finished === 0 ? 0 : Math.round((noShow / finished) * 100),
  };
}

/** Working days (Sundays skipped) between `from` and `to`, scanning at most 62 calendar days. */
export function reportDays(from: string, to: string): string[] {
  const days: string[] = [];
  const end = fromDateKey(to);
  let d = fromDateKey(from);
  for (let guard = 0; d <= end && guard < MAX_REPORT_DAYS; guard++) {
    if (d.getDay() !== 0) days.push(toDateKey(d));
    d = addDays(d, 1);
  }
  return days;
}

export function dailyBreakdown(
  appointments: readonly Appointment[],
  days: readonly string[],
): DailyBreakdown[] {
  return days.map((date) => {
    const ofDay = appointments.filter((a) => a.date === date);
    const counts = Object.fromEntries(
      ALL_STATUSES.map((s) => [s, ofDay.filter((a) => a.status === s).length]),
    ) as Record<AppointmentStatus, number>;
    return { date, total: ofDay.length, counts };
  });
}
