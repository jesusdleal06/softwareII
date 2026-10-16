import { generateCode } from './appointment-code';
import { makeAppointment } from '../testing/appointment.fixture';

describe('generateCode', () => {
  it('returns the next VD- code after the highest numeric one', () => {
    const appointments = [
      makeAppointment({ code: 'VD-1041' }),
      makeAppointment({ code: 'VD-1056' }),
      makeAppointment({ code: 'VD-ABC' }),
    ];
    expect(generateCode(appointments)).toBe('VD-1057');
  });

  it('starts at VD-1001 when there are no appointments', () => {
    expect(generateCode([])).toBe('VD-1001');
  });
});
