import { Clinic, Shift } from '../models';

/** Public contact details shown across the site. */
export const CLINIC: Clinic = {
  name: 'Centro Odontológico Villadent',
  shortName: 'Villadent',
  address: 'Calle 45 # 27-18, Bucaramanga',
  phone: '(607) 645 12 34',
  whatsapp: '+57 300 123 4567',
};

/** UI working shifts. Availability itself is always owned by the API. */
export const SHIFTS: readonly Shift[] = [
  { name: 'Mañana', start: 8 * 60, end: 12 * 60 },
  { name: 'Tarde', start: 14 * 60, end: 18 * 60 },
];
