import { reminderInfo } from './reminder';

describe('reminderInfo', () => {
  it('schedules morning appointments the day before at 18:00', () => {
    expect(reminderInfo({ date: '2026-10-15', time: '11:30' })).toEqual({
      date: '2026-10-14',
      time: '18:00',
      text: 'el día anterior (14/10/2026) a las 6:00 PM',
    });
  });

  it('crosses month boundaries for the day-before reminder', () => {
    expect(reminderInfo({ date: '2026-11-02', time: '08:00' }).date).toBe('2026-11-01');
  });

  it('schedules afternoon appointments the same day at 08:00', () => {
    expect(reminderInfo({ date: '2026-10-15', time: '14:00' })).toEqual({
      date: '2026-10-15',
      time: '08:00',
      text: 'el mismo día (15/10/2026) a las 8:00 AM',
    });
  });
});
