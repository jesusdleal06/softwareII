// Time-of-day helpers. Times are `HH:MM` (24 h) strings or minutes from midnight.

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function toHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** `16:30` → `4:30 PM`. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatTimeFromMinutes(minutes: number): string {
  return formatTime(toHhmm(minutes));
}

export function isMorning(hhmm: string): boolean {
  return toMinutes(hhmm) < 12 * 60;
}
