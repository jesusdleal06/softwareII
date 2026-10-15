import { formatTime, formatTimeFromMinutes, isMorning, toHhmm, toMinutes } from './time';

describe('time', () => {
  it('converts HH:MM to minutes and back', () => {
    expect(toMinutes('08:30')).toBe(510);
    expect(toHhmm(510)).toBe('08:30');
    expect(toHhmm(14 * 60)).toBe('14:00');
  });

  it('formats 12-hour times with AM/PM', () => {
    expect(formatTime('08:00')).toBe('8:00 AM');
    expect(formatTime('12:30')).toBe('12:30 PM');
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('16:30')).toBe('4:30 PM');
    expect(formatTimeFromMinutes(18 * 60)).toBe('6:00 PM');
  });

  it('treats times before 12:00 as morning', () => {
    expect(isMorning('11:59')).toBe(true);
    expect(isMorning('12:00')).toBe(false);
    expect(isMorning('14:00')).toBe(false);
  });
});
