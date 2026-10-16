import { dentistById, durationOf, endOf, procedureById } from './catalog';

describe('catalog', () => {
  it('looks up dentists and procedures by id', () => {
    expect(dentistById('d2')?.name).toBe('Dr. Andrés Peña');
    expect(dentistById('nope')).toBeUndefined();
    expect(procedureById('p5')?.name).toBe('Instalación de brackets');
  });

  it('uses the procedure duration, defaulting to 30 minutes', () => {
    expect(durationOf({ procedureId: 'p4' })).toBe(60);
    expect(durationOf({ procedureId: 'unknown' })).toBe(30);
  });

  it('computes the end minute of an appointment', () => {
    expect(endOf({ time: '09:00', procedureId: 'p2' })).toBe(9 * 60 + 45);
  });
});
