import {
  addDays,
  formatDate,
  formatLongDate,
  fromDateKey,
  longDayName,
  mondayOf,
  monthName,
  shortDayName,
  toDateKey,
  workWeek,
} from './dates';

describe('dates', () => {
  it('converts between Date and local yyyy-mm-dd keys', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    const d = fromDateKey('2026-10-14');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 14, 0]);
  });

  it('adds days across month boundaries without mutating the input', () => {
    const base = new Date(2026, 9, 31);
    expect(toDateKey(addDays(base, 1))).toBe('2026-11-01');
    expect(toDateKey(base)).toBe('2026-10-31');
  });

  it('finds the Monday of the week (Sunday belongs to the previous week)', () => {
    expect(toDateKey(mondayOf(new Date(2026, 9, 14, 15, 0)))).toBe('2026-10-12');
    expect(toDateKey(mondayOf(new Date(2026, 9, 18)))).toBe('2026-10-12');
    expect(mondayOf(new Date(2026, 9, 14, 15, 0)).getHours()).toBe(0);
  });

  it('returns the Monday-to-Saturday work week', () => {
    expect(workWeek(new Date(2026, 9, 14)).map(toDateKey)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
    ]);
  });

  it('formats dates in Spanish', () => {
    expect(formatDate('2026-10-14')).toBe('14/10/2026');
    expect(formatLongDate('2026-10-14')).toBe('miércoles 14 de octubre de 2026');
    expect(shortDayName(new Date(2026, 9, 17))).toBe('Sáb');
    expect(longDayName(new Date(2026, 9, 18))).toBe('domingo');
    expect(monthName(new Date(2026, 0, 1))).toBe('enero');
  });
});
