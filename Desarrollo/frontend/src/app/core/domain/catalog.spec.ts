import { makeAppointment } from '../testing/appointment.fixture';
import { dentistById, durationOf, endOf, procedureById } from './catalog';

describe('catalog', () => {
  it('looks up dentists and procedures by id', () => {
    const dentist = { id: 'd2', name: 'Dr. Andrés Peña', specialty: '', description: '', initials: 'AP' };
    const procedure = { id: 'p5', name: 'Instalación de brackets', durationMinutes: 90 };
    expect(dentistById('d2', [dentist])?.name).toBe('Dr. Andrés Peña');
    expect(dentistById('nope', [dentist])).toBeUndefined();
    expect(procedureById('p5', [procedure])?.name).toBe('Instalación de brackets');
  });

  it('uses the procedure duration, defaulting to 30 minutes', () => {
    expect(durationOf(makeAppointment({ durationMinutes: 60 }))).toBe(60);
    expect(durationOf(makeAppointment())).toBe(30);
  });

  it('computes the end minute of an appointment', () => {
    expect(endOf(makeAppointment({ time: '09:00', durationMinutes: 45 }))).toBe(9 * 60 + 45);
  });
});
