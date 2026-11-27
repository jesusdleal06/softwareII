import { Clinic, Shift } from '../models';
import { fromDateKey } from '../domain/dates';

/** Public contact details shown across the site. */
export const CLINIC: Clinic = {
  name: 'Centro Odontológico Villadent',
  shortName: 'Villadent',
  address: 'Cra. 10 #21-14, Villa Del Rosario, Norte de Santander, Colombia',
  phone: '+57 314 4223133',
  whatsapp: '+57 314 4223133',
};

/** Monday to Friday: morning and afternoon, with the lunch break between them. */
const WEEKDAY_WINDOWS: readonly Shift[] = [
  { name: 'Mañana', start: 8 * 60, end: 12 * 60 },
  { name: 'Tarde', start: 14 * 60, end: 18 * 60 },
];

/** Sunday: one continuous morning. */
const SUNDAY_WINDOWS: readonly Shift[] = [{ name: 'Mañana', start: 8 * 60, end: 13 * 60 }];

/** The clinic does not open: no window is offered and the day is not bookable. */
const CLOSED_WINDOWS: readonly Shift[] = [];

/**
 * UI opening windows per weekday, indexed by `Date#getDay()` (0 = Sunday).
 * The single frontend source of truth for the clinic hours: a day without
 * windows is closed. Availability itself is always owned by the API.
 */
const WINDOWS_BY_DAY: readonly (readonly Shift[])[] = [
  SUNDAY_WINDOWS,
  WEEKDAY_WINDOWS,
  WEEKDAY_WINDOWS,
  WEEKDAY_WINDOWS,
  WEEKDAY_WINDOWS,
  WEEKDAY_WINDOWS,
  CLOSED_WINDOWS, // Saturday
];

/** Opening windows of a weekday (`getDay()` index). Empty when the clinic is closed. */
export function shiftsForDay(day: number): readonly Shift[] {
  return WINDOWS_BY_DAY[day] ?? CLOSED_WINDOWS;
}

/** Opening windows of the day a `yyyy-mm-dd` key falls on. Empty when the clinic is closed. */
export function shiftsForDate(dateKey: string): readonly Shift[] {
  return shiftsForDay(fromDateKey(dateKey).getDay());
}
