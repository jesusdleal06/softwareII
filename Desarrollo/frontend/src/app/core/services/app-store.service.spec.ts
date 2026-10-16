import { TestBed } from '@angular/core/testing';
import { AppStore } from './app-store.service';
import { CLOCK, SESSION_STORAGE } from './tokens';
import { NewAppointmentInput } from '../models';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

// Wednesday 2026-10-14 09:10; Thursday 15 is free for d1 at 10:00.
const NOW = new Date(2026, 9, 14, 9, 10);
const THURSDAY = '2026-10-15';

function setup(storage = new MemoryStorage()): AppStore {
  TestBed.configureTestingModule({
    providers: [
      { provide: CLOCK, useValue: () => new Date(NOW) },
      { provide: SESSION_STORAGE, useValue: storage },
    ],
  });
  return TestBed.inject(AppStore);
}

const booking: NewAppointmentInput = {
  dentistId: 'd1',
  procedureId: 'p1',
  date: THURSDAY,
  time: '10:00',
  patientName: 'Nuevo Paciente',
  patientPhone: '3001112222',
  origin: 'Web',
};

describe('AppStore', () => {
  it('starts with the mock week built from the injected clock', () => {
    const store = setup();
    expect(store.appointments()).toHaveLength(16);
    expect(store.appointments()[0].date).toBe('2026-10-12');
  });

  it('books an appointment and removes the slot from availability', () => {
    const store = setup();
    const slots = () =>
      store.availableSlots({ dentistId: 'd1', date: THURSDAY, durationMinutes: 30 });
    expect(slots()).toContain('10:00');

    const result = store.createAppointment(booking);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.appointment).toMatchObject({
      ...booking,
      code: 'VD-1057',
      status: 'Pendiente',
      reminder: 'Programado',
    });
    expect(store.appointments()).toHaveLength(17);
    expect(slots()).not.toContain('10:00');
  });

  it('rejects a second active appointment for the same phone', () => {
    const store = setup();
    const first = store.createAppointment(booking);
    const second = store.createAppointment({
      ...booking,
      time: '15:00',
      patientPhone: '300 111 2222',
    });

    expect(second).toEqual({
      ok: false,
      reason: 'cita-activa',
      activeAppointment: first.ok ? first.appointment : undefined,
    });
    expect(store.appointments()).toHaveLength(17);
  });

  it('rejects booking an occupied slot as a conflict', () => {
    const store = setup();
    // Seed: d1 has Diana Carolina Ruiz (Calza, 45 min) on Thursday at 09:00.
    const result = store.createAppointment({ ...booking, time: '09:30' });
    expect(result).toEqual({ ok: false, reason: 'conflicto' });
  });

  it('cancelling frees the slot and allows the phone to book again', () => {
    const store = setup();
    const created = store.createAppointment(booking);
    if (!created.ok) throw new Error('expected booking to succeed');

    store.cancel(created.appointment.id);

    expect(store.appointmentByCode(created.appointment.code)?.status).toBe('Cancelada');
    expect(
      store.availableSlots({ dentistId: 'd1', date: THURSDAY, durationMinutes: 30 }),
    ).toContain('10:00');
    expect(store.createAppointment(booking).ok).toBe(true);
  });

  it('reschedules into a free slot, marking it Reprogramada with a new reminder', () => {
    const store = setup();
    const created = store.createAppointment(booking);
    if (!created.ok) throw new Error('expected booking to succeed');

    const moved = store.rescheduleAppointment(created.appointment.id, THURSDAY, '10:30');

    expect(moved.ok).toBe(true);
    const current = store.appointmentByCode(created.appointment.code);
    expect(current).toMatchObject({
      time: '10:30',
      status: 'Reprogramada',
      reminder: 'Programado',
    });
    const slots = store.availableSlots({ dentistId: 'd1', date: THURSDAY, durationMinutes: 30 });
    expect(slots).toContain('10:00');
    expect(slots).not.toContain('10:30');
  });

  it('rejects rescheduling into an occupied slot or an unknown appointment', () => {
    const store = setup();
    const created = store.createAppointment(booking);
    if (!created.ok) throw new Error('expected booking to succeed');
    expect(store.rescheduleAppointment(created.appointment.id, THURSDAY, '09:00')).toEqual({
      ok: false,
      reason: 'conflicto',
    });
    expect(store.rescheduleAppointment('missing', THURSDAY, '10:30')).toEqual({
      ok: false,
      reason: 'conflicto',
    });
  });

  it('changes status through confirm, markAttended and markNoShow', () => {
    const store = setup();
    const id = store.appointments()[10].id;
    store.confirm(id);
    expect(store.appointments()[10].status).toBe('Confirmada');
    store.markAttended(id);
    expect(store.appointments()[10].status).toBe('Atendida');
    store.markNoShow(id);
    expect(store.appointments()[10].status).toBe('No asistió');
  });

  it('finds appointments by code case-insensitively', () => {
    const store = setup();
    expect(store.appointmentByCode('vd-1049')?.patientName).toBe('Rosa Elvira Jaimes');
    expect(store.appointmentByCode('VD-9999')).toBeUndefined();
  });

  describe('session', () => {
    it('logs in with case-insensitive, trimmed email and strips the password', () => {
      const storage = new MemoryStorage();
      const store = setup(storage);

      const session = store.login('  ANA@villadent.co ', 'villadent2024');

      expect(session).toEqual({
        email: 'ana@villadent.co',
        name: 'Ana María Rueda',
        role: 'Auxiliar administrativa',
      });
      expect(store.session()).toEqual(session);
      expect(store.isAuthenticated()).toBe(true);
      expect(JSON.parse(storage.getItem('villadent-sesion') ?? 'null')).toEqual(session);
    });

    it('rejects wrong credentials', () => {
      const store = setup();
      expect(store.login('ana@villadent.co', 'wrong')).toBeNull();
      expect(store.session()).toBeNull();
    });

    it('restores the session from storage and clears it on logout', () => {
      const storage = new MemoryStorage();
      const saved = {
        email: 'laura@villadent.co',
        name: 'Dra. Laura Villamizar',
        role: 'Odontóloga',
        dentistId: 'd1',
      };
      storage.setItem('villadent-sesion', JSON.stringify(saved));
      const store = setup(storage);

      expect(store.session()).toEqual(saved);

      store.logout();
      expect(store.session()).toBeNull();
      expect(storage.getItem('villadent-sesion')).toBeNull();
    });

    it('ignores a corrupted stored session', () => {
      const storage = new MemoryStorage();
      storage.setItem('villadent-sesion', '{not json');
      expect(setup(storage).session()).toBeNull();
    });
  });
});
