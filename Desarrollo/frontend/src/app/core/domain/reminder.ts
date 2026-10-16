import { Appointment } from '../models';
import { addDays, formatDate, fromDateKey, toDateKey } from './dates';
import { isMorning } from './time';

export interface ReminderInfo {
  date: string;
  time: string;
  /** Spanish sentence fragment shown to the patient. */
  text: string;
}

/** Morning appointments: day before at 18:00. Afternoon: same day at 08:00. */
export function reminderInfo(appointment: Pick<Appointment, 'date' | 'time'>): ReminderInfo {
  if (isMorning(appointment.time)) {
    const dayBefore = toDateKey(addDays(fromDateKey(appointment.date), -1));
    return {
      date: dayBefore,
      time: '18:00',
      text: `el día anterior (${formatDate(dayBefore)}) a las 6:00 PM`,
    };
  }
  return {
    date: appointment.date,
    time: '08:00',
    text: `el mismo día (${formatDate(appointment.date)}) a las 8:00 AM`,
  };
}
