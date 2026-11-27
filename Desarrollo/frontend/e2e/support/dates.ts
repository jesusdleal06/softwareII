const SHORT_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const LONG_DAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
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

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function addDaysKey(key: string, days: number): string {
  return toDateKey(addDays(fromDateKey(key), days));
}

export function mondayOf(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = result.getDay();
  result.setDate(result.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return result;
}

export function dayDiff(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function shortDayName(date: Date): string {
  return SHORT_DAY_NAMES[date.getDay()];
}

export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function formatLongDate(date: Date): string {
  return `${LONG_DAY_NAMES[date.getDay()]} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`;
}

export function formatTimeLabel(hhmm: string): string {
  const [hour, minute] = hhmm.split(':').map(Number);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function monthRange(now = new Date()): { from: string; to: string } {
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateKey(first), to: toDateKey(last) };
}
