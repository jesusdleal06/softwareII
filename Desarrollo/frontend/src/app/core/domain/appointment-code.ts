import { Appointment } from '../models';

const CODE_PREFIX = 'VD-';
const CODE_BASE = 1000;

/** Next public code: highest numeric `VD-` code + 1 (starting at VD-1001). */
export function generateCode(appointments: readonly Pick<Appointment, 'code'>[]): string {
  const max = appointments.reduce((acc, a) => {
    const n = Number(a.code.replace(CODE_PREFIX, ''));
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, CODE_BASE);
  return `${CODE_PREFIX}${max + 1}`;
}
