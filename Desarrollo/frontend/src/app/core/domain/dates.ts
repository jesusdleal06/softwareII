// Local-calendar date helpers. Dates are exchanged as `yyyy-mm-dd` keys,
// which sort lexicographically in chronological order.

const SHORT_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const LONG_DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Monday 00:00 of the week containing `d` (Sunday belongs to the previous week). */
export function mondayOf(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Monday to Saturday of the week containing `base`. */
export function workWeek(base: Date): Date[] {
  const monday = mondayOf(base);
  return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
}

/** `yyyy-mm-dd` → `dd/mm/yyyy`. */
export function formatDate(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** e.g. `miércoles 14 de octubre de 2026`. */
export function formatLongDate(key: string): string {
  const d = fromDateKey(key);
  return `${LONG_DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function shortDayName(d: Date): string {
  return SHORT_DAY_NAMES[d.getDay()];
}

export function longDayName(d: Date): string {
  return LONG_DAY_NAMES[d.getDay()];
}

export function monthName(d: Date): string {
  return MONTH_NAMES[d.getMonth()];
}
