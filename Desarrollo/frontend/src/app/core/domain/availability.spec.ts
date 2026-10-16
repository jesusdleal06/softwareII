import {
  ACTIVE_STATUSES,
  availableSlots,
  isPastDate,
  isSlotAvailable,
  isWorkingDay,
} from './availability';
import { makeAppointment } from '../testing/appointment.fixture';

// Reference "now": Wednesday 2026-10-14 at 09:10 local time.
const NOW = new Date(2026, 9, 14, 9, 10);
const THURSDAY = '2026-10-15';

describe('availability', () => {
  it('considers Pendiente, Confirmada and Reprogramada as active', () => {
    expect(ACTIVE_STATUSES).toEqual(['Pendiente', 'Confirmada', 'Reprogramada']);
  });

  it('treats Sunday as non-working and earlier dates as past', () => {
    expect(isWorkingDay('2026-10-18')).toBe(false);
    expect(isWorkingDay('2026-10-17')).toBe(true);
    expect(isPastDate('2026-10-13', NOW)).toBe(true);
    expect(isPastDate('2026-10-14', NOW)).toBe(false);
  });

  it('offers every 30-minute start that fits inside the morning and afternoon shifts', () => {
    const slots = availableSlots({
      dentistId: 'd1',
      date: THURSDAY,
      durationMinutes: 90,
      appointments: [],
      now: NOW,
    });
    expect(slots).toEqual([
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
    ]);
  });

  it('keeps each dentist agenda independent', () => {
    const appointments = [makeAppointment({ dentistId: 'd1', date: THURSDAY, time: '08:00' })];
    const opts = { date: THURSDAY, durationMinutes: 30, appointments, now: NOW };
    expect(availableSlots({ ...opts, dentistId: 'd1' })).not.toContain('08:00');
    expect(availableSlots({ ...opts, dentistId: 'd2' })).toContain('08:00');
  });

  it('only offers a slot when the full procedure fits before the next appointment', () => {
    // d1 busy 10:00-10:30; a 60-minute procedure cannot start at 09:30 but can at 09:00.
    const appointments = [makeAppointment({ date: THURSDAY, time: '10:00', procedureId: 'p1' })];
    const slots = availableSlots({
      dentistId: 'd1',
      date: THURSDAY,
      durationMinutes: 60,
      appointments,
      now: NOW,
    });
    expect(slots).toContain('09:00');
    expect(slots).not.toContain('09:30');
    expect(slots).not.toContain('10:00');
    expect(slots).toContain('10:30');
  });

  it('blocks starts that overlap the tail of a longer appointment', () => {
    // Exodoncia (60 min) at 14:00 occupies 14:00-15:00.
    const appointments = [makeAppointment({ date: THURSDAY, time: '14:00', procedureId: 'p4' })];
    const slots = availableSlots({
      dentistId: 'd1',
      date: THURSDAY,
      durationMinutes: 30,
      appointments,
      now: NOW,
    });
    expect(slots).not.toContain('14:30');
    expect(slots).toContain('15:00');
  });

  it('frees the slot of cancelled (and other inactive) appointments', () => {
    const appointments = [
      makeAppointment({ id: 'a', date: THURSDAY, time: '08:00', status: 'Cancelada' }),
      makeAppointment({ id: 'b', date: THURSDAY, time: '09:00', status: 'No asistió' }),
      makeAppointment({ id: 'c', date: THURSDAY, time: '10:00', status: 'Atendida' }),
    ];
    const slots = availableSlots({
      dentistId: 'd1',
      date: THURSDAY,
      durationMinutes: 30,
      appointments,
      now: NOW,
    });
    expect(slots).toEqual(expect.arrayContaining(['08:00', '09:00', '10:00']));
  });

  it('ignores the appointment being rescheduled', () => {
    const appointments = [makeAppointment({ id: 'r1', date: THURSDAY, time: '08:00' })];
    const base = { dentistId: 'd1', date: THURSDAY, durationMinutes: 30, appointments, now: NOW };
    expect(availableSlots(base)).not.toContain('08:00');
    expect(availableSlots({ ...base, excludeAppointmentId: 'r1' })).toContain('08:00');
  });

  it('returns nothing for Sundays and past dates', () => {
    const base = { dentistId: 'd1', durationMinutes: 30, appointments: [], now: NOW };
    expect(availableSlots({ ...base, date: '2026-10-18' })).toEqual([]);
    expect(availableSlots({ ...base, date: '2026-10-13' })).toEqual([]);
  });

  it('skips today slots that already started', () => {
    const slots = availableSlots({
      dentistId: 'd1',
      date: '2026-10-14',
      durationMinutes: 30,
      appointments: [],
      now: NOW,
    });
    expect(slots[0]).toBe('09:30');
    expect(slots).not.toContain('09:00');
  });

  it('checks a single slot', () => {
    const appointments = [makeAppointment({ date: THURSDAY, time: '08:00' })];
    const base = { dentistId: 'd1', date: THURSDAY, durationMinutes: 30, appointments, now: NOW };
    expect(isSlotAvailable({ ...base, time: '08:00' })).toBe(false);
    expect(isSlotAvailable({ ...base, time: '08:30' })).toBe(true);
    expect(isSlotAvailable({ ...base, time: '08:15' })).toBe(false);
  });
});
