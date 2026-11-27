import { Clinic, Shift } from '../models';

/** Public contact details shown across the site. */
export const CLINIC: Clinic = {
  name: 'Centro Odontológico Villadent',
  shortName: 'Villadent',
  address: 'Cra. 10 #21-14, Villa del Rosario, Norte de Santander',
  phone: '314 422 3133',
  whatsapp: '+57 314 422 3133',
};

/** UI working shifts. Availability itself is always owned by the API. */
export const SHIFTS: readonly Shift[] = [
  { name: 'Mañana', start: 8 * 60, end: 12 * 60 },
  { name: 'Tarde', start: 14 * 60, end: 18 * 60 },
];
