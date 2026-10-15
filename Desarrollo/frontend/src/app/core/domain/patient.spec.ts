import {
  findActiveAppointment,
  formatPhone,
  isValidPhone,
  normalizePhone,
  validatePatient,
} from './patient';
import { makeAppointment } from '../testing/appointment.fixture';

const NOW = new Date(2026, 9, 14, 9, 10);

describe('patient rules', () => {
  describe('phone', () => {
    it('normalizes to digits only', () => {
      expect(normalizePhone('300 123-4567')).toBe('3001234567');
    });

    it('accepts exactly 10 digits starting with 3 (Colombian mobile)', () => {
      expect(isValidPhone('3001234567')).toBe(true);
      expect(isValidPhone('300 123 4567')).toBe(true);
      expect(isValidPhone('300123456')).toBe(false);
      expect(isValidPhone('30012345678')).toBe(false);
      expect(isValidPhone('6071234567')).toBe(false);
    });

    it('formats 10-digit phones as 3-3-4 and leaves others untouched', () => {
      expect(formatPhone('3001234567')).toBe('300 123 4567');
      expect(formatPhone('12345')).toBe('12345');
    });
  });

  describe('validatePatient', () => {
    it('returns no errors for a valid patient', () => {
      expect(validatePatient({ name: 'Ana Rueda', phone: '3001234567' })).toEqual({});
    });

    it('requires the name and asks for first and last name', () => {
      expect(validatePatient({ name: '  ', phone: '3001234567' }).name).toBe(
        'El nombre completo es obligatorio.',
      );
      expect(validatePatient({ name: 'Ana', phone: '3001234567' }).name).toBe(
        'Escribe nombre y apellido.',
      );
    });

    it('requires a 10-digit Colombian mobile phone', () => {
      expect(validatePatient({ name: 'Ana Rueda', phone: '' }).phone).toBe(
        'El número de celular es obligatorio.',
      );
      expect(validatePatient({ name: 'Ana Rueda', phone: '30012' }).phone).toBe(
        'El celular debe tener 10 dígitos.',
      );
      expect(validatePatient({ name: 'Ana Rueda', phone: '6071234567' }).phone).toBe(
        'Escribe un celular colombiano válido (empieza por 3).',
      );
    });
  });

  describe('findActiveAppointment (one active future appointment per phone)', () => {
    const phone = '3001234567';

    it('finds an active appointment from today onwards, matching normalized phones', () => {
      const active = makeAppointment({ id: 'a', patientPhone: phone, date: '2026-10-14' });
      expect(findActiveAppointment('300 123 4567', [active], NOW)).toBe(active);
    });

    it('ignores past, inactive, other-phone and excluded appointments', () => {
      const appointments = [
        makeAppointment({ id: 'past', patientPhone: phone, date: '2026-10-13' }),
        makeAppointment({ id: 'cancelled', patientPhone: phone, status: 'Cancelada' }),
        makeAppointment({ id: 'attended', patientPhone: phone, status: 'Atendida' }),
        makeAppointment({ id: 'other', patientPhone: '3109999999' }),
        makeAppointment({ id: 'self', patientPhone: phone }),
      ];
      expect(findActiveAppointment(phone, appointments, NOW, 'self')).toBeUndefined();
    });

    it('treats Confirmada and Reprogramada as active too', () => {
      const appointments = [
        makeAppointment({ id: 'r', patientPhone: phone, status: 'Reprogramada' }),
      ];
      expect(findActiveAppointment(phone, appointments, NOW)?.id).toBe('r');
    });
  });
});
