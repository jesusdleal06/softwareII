import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiError } from '../api/api-error';
import {
  LoginResponseDto,
  ManagedAppointmentDto,
  PublicAppointmentDto,
  StaffAppointmentDto,
} from '../api/api.types';
import { ClinicApi } from '../api/clinic-api';
import { NewAppointmentInput } from '../models';
import { AppStore } from './app-store.service';
import { CLOCK, SESSION_STORAGE } from './tokens';

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

const NOW = new Date(2026, 9, 14, 9, 10);
const THURSDAY = '2026-10-15';

// Exactly what GET /api/v1/public/dentists and /procedures return: active records only,
// without `active` or `userId`.
const dentist = {
  id: 1,
  name: 'Dra. Laura Villamizar',
  specialty: 'Odontología general',
};
const procedure = {
  id: 1,
  name: 'Limpieza',
  durationMinutes: 30,
};
// GET /api/v1/dentists (staff only) adds the linked user and the active flag.
const staffDentist = { ...dentist, userId: 3, active: true };
const staffAppointment: StaffAppointmentDto = {
  id: 10,
  code: 'VD-1057',
  patientId: 1,
  patientName: 'Nuevo Paciente',
  patientPhone: '3001112222',
  dentistId: 1,
  dentistName: 'Dra. Laura Villamizar',
  procedureId: 1,
  procedureName: 'Limpieza',
  date: THURSDAY,
  time: '10:00',
  durationMinutes: 30,
  status: 'PENDIENTE',
  origin: 'MANUAL',
  reminderStatus: 'PROGRAMADO',
  reminderAttempts: 0,
};
const publicAppointment: PublicAppointmentDto = {
  id: 10,
  code: 'VD-1057',
  dentistId: 1,
  dentistName: 'Dra. Laura Villamizar',
  procedureId: 1,
  procedureName: 'Limpieza',
  date: THURSDAY,
  time: '10:00',
  durationMinutes: 30,
  status: 'PENDIENTE',
};
const managedAppointment: ManagedAppointmentDto = {
  id: 10,
  code: 'VD-1057',
  dentistId: 1,
  procedureId: 1,
  patientName: 'Nuevo Paciente',
  patientPhone: '3001112222',
  dentistName: 'Dra. Laura Villamizar',
  procedureName: 'Limpieza',
  date: THURSDAY,
  time: '10:00',
  durationMinutes: 30,
  status: 'PENDIENTE',
};

function createApi() {
  return {
    setToken: vi.fn(),
    login: vi.fn(() =>
      Promise.resolve<LoginResponseDto>({
        token: 'jwt-token',
        tokenType: 'Bearer',
        expiresInSeconds: 3600,
        user: { id: 3, name: 'Dra. Laura Villamizar', email: 'laura@villadent.co', role: 'ODONTOLOGO', active: true },
      }),
    ),
    dentists: vi.fn(() => Promise.resolve([dentist])),
    staffDentists: vi.fn(() => Promise.resolve([staffDentist, { ...staffDentist, id: 2, name: 'Dr. Andrés Peña', userId: null }])),
    procedures: vi.fn(() => Promise.resolve([procedure])),
    availability: vi.fn(() => Promise.resolve({ dentistId: 1, procedureId: 1, date: THURSDAY, slots: ['10:00', '10:30'] })),
    agenda: vi.fn(() => Promise.resolve([staffAppointment])),
    bookPublic: vi.fn(() => Promise.resolve(publicAppointment)),
    bookStaff: vi.fn(() => Promise.resolve(staffAppointment)),
    rescheduleStaff: vi.fn(() => Promise.resolve({ ...staffAppointment, time: '10:30', status: 'REPROGRAMADA' as const })),
    changeStatus: vi.fn(() => Promise.resolve({ ...staffAppointment, status: 'CONFIRMADA' as const })),
    managed: vi.fn(() => Promise.resolve(managedAppointment)),
    confirmManaged: vi.fn(() => Promise.resolve({ ...managedAppointment, status: 'CONFIRMADA' as const })),
    cancelManaged: vi.fn(() => Promise.resolve({ ...managedAppointment, status: 'CANCELADA' as const })),
    rescheduleManaged: vi.fn(() => Promise.resolve({ ...managedAppointment, time: '10:30', status: 'REPROGRAMADA' as const })),
    report: vi.fn(() => Promise.resolve({ from: '2026-10-12', to: '2026-10-17', dentistId: null, total: 0, attended: 0, cancelled: 0, noShow: 0, noShowRate: 0, daily: [] })),
    exportReport: vi.fn(() => Promise.resolve({ blob: new Blob(['a']), filename: 'reporte.csv' })),
  };
}

type FakeApi = ReturnType<typeof createApi>;

function setup(storage = new MemoryStorage(), api: FakeApi = createApi()): { store: AppStore; api: FakeApi } {
  TestBed.configureTestingModule({
    providers: [
      { provide: ClinicApi, useValue: api },
      { provide: CLOCK, useValue: () => new Date(NOW) },
      { provide: SESSION_STORAGE, useValue: storage },
    ],
  });
  return { store: TestBed.inject(AppStore), api };
}

const booking: NewAppointmentInput = {
  dentistId: '1',
  procedureId: '1',
  date: THURSDAY,
  time: '10:00',
  patientName: 'Nuevo Paciente',
  patientPhone: '3001112222',
  origin: 'Web',
};

describe('AppStore', () => {
  it('loads the public catalogs exactly as the API sends them', async () => {
    const { store, api } = setup();
    api.dentists.mockResolvedValue([dentist, { id: 2, name: 'Dr. Andrés Peña', specialty: 'Ortodoncia' }]);
    await store.ensureCatalogs();
    expect(store.dentists().map((d) => d.name)).toEqual(['Dra. Laura Villamizar', 'Dr. Andrés Peña']);
    expect(store.dentists()[0]).toMatchObject({ id: '1', specialty: 'Odontología general' });
    expect(store.procedures()).toEqual([{ id: '1', name: 'Limpieza', durationMinutes: 30 }]);
  });

  it('books a public appointment through the API and maps the response', async () => {
    const { store, api } = setup();
    await store.ensureCatalogs();

    const result = await store.createAppointment(booking);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.appointment).toMatchObject({ id: '10', code: 'VD-1057', status: 'Pendiente', origin: 'Web' });
    expect(api.bookPublic).toHaveBeenCalledWith({
      patientName: 'Nuevo Paciente',
      patientPhone: '3001112222',
      dentistId: 1,
      procedureId: 1,
      date: THURSDAY,
      time: '10:00',
    });
  });

  it('translates an active-appointment rejection', async () => {
    const { store, api } = setup();
    await store.ensureCatalogs();
    api.bookPublic.mockRejectedValue(new ApiError(409, 'ACTIVE_APPOINTMENT_EXISTS', 'Ya existe'));

    await expect(store.createAppointment(booking)).resolves.toEqual({ ok: false, reason: 'cita-activa' });
  });

  it('translates a taken-slot rejection', async () => {
    const { store, api } = setup();
    await store.ensureCatalogs();
    api.bookPublic.mockRejectedValue(new ApiError(409, 'SLOT_TAKEN', 'Ocupado'));

    await expect(store.createAppointment(booking)).resolves.toEqual({ ok: false, reason: 'conflicto' });
  });

  it('loads availability slots from the API', async () => {
    const { store, api } = setup();
    await expect(store.availability('1', '1', THURSDAY)).resolves.toEqual(['10:00', '10:30']);
    expect(api.availability).toHaveBeenCalledWith('1', '1', THURSDAY);
  });

  it('loads the agenda and upserts staff mutations', async () => {
    const { store, api } = setup();
    await store.loadAgenda(THURSDAY, '1');
    expect(store.appointments()).toHaveLength(1);

    const changed = await store.confirm('10');
    expect(changed.status).toBe('Confirmada');
    expect(store.appointments()[0].status).toBe('Confirmada');
    expect(api.changeStatus).toHaveBeenCalledWith('10', 'CONFIRMADA');
  });

  it('reschedules through the API and maps a conflict', async () => {
    const { store, api } = setup();
    await store.loadAgenda(THURSDAY, '1');
    const moved = await store.rescheduleAppointment('10', THURSDAY, '10:30');
    expect(moved.ok).toBe(true);
    expect(store.appointments()[0]).toMatchObject({ time: '10:30', status: 'Reprogramada' });

    api.rescheduleStaff.mockRejectedValue(new ApiError(409, 'SLOT_TAKEN', 'Ocupado'));
    await expect(store.rescheduleAppointment('10', THURSDAY, '09:00')).resolves.toEqual({ ok: false, reason: 'conflicto' });
  });

  it('manages a public appointment by opaque token', async () => {
    const { store } = setup();
    await expect(store.managed('token-1')).resolves.toMatchObject({ id: '10', code: 'VD-1057' });
    await expect(store.confirmManaged('token-1')).resolves.toMatchObject({ status: 'Confirmada' });
    await expect(store.cancelManaged('token-1')).resolves.toMatchObject({ status: 'Cancelada' });
    await expect(store.rescheduleManaged('token-1', THURSDAY, '10:30')).resolves.toMatchObject({ time: '10:30' });
  });

  it('returns null when the management token is unknown', async () => {
    const { store, api } = setup();
    api.managed.mockRejectedValue(new ApiError(404, null, 'No encontrada'));
    await expect(store.managed('missing')).resolves.toBeNull();
  });

  describe('session', () => {
    it('logs in, maps the role and resolves its dentist', async () => {
      const storage = new MemoryStorage();
      const { store, api } = setup(storage);

      const session = await store.login('  LAURA@villadent.co ', 'secret');

      expect(api.login).toHaveBeenCalledWith('laura@villadent.co', 'secret');
      expect(session).toMatchObject({
        email: 'laura@villadent.co',
        role: 'Odontóloga',
        dentistId: '1',
        userId: '3',
        token: 'jwt-token',
      });
      expect(api.setToken).toHaveBeenCalledWith('jwt-token');
      // The public catalog has no userId: the dentist link comes from the staff endpoint.
      expect(api.staffDentists).toHaveBeenCalled();
      expect(store.isAuthenticated()).toBe(true);
      expect(JSON.parse(storage.getItem('villadent-sesion') ?? 'null')).toMatchObject({ token: 'jwt-token' });
    });

    it('returns null for rejected credentials', async () => {
      const { store, api } = setup();
      api.login.mockRejectedValue(new ApiError(401, null, 'Credenciales'));
      await expect(store.login('ana@villadent.co', 'wrong')).resolves.toBeNull();
      expect(store.session()).toBeNull();
    });

    it('rethrows connection failures', async () => {
      const { store, api } = setup();
      api.login.mockRejectedValue(new Error('offline'));
      await expect(store.login('ana@villadent.co', 'secret')).rejects.toThrow('offline');
    });

    it('restores the session from storage and clears it on logout', () => {
      const storage = new MemoryStorage();
      const saved = {
        email: 'laura@villadent.co',
        name: 'Dra. Laura Villamizar',
        role: 'Odontóloga',
        userId: '3',
        dentistId: '1',
        token: 'jwt-token',
      };
      storage.setItem('villadent-sesion', JSON.stringify(saved));
      const { store, api } = setup(storage);

      expect(store.session()).toEqual(saved);
      expect(api.setToken).toHaveBeenCalledWith('jwt-token');

      store.logout();
      expect(store.session()).toBeNull();
      expect(storage.getItem('villadent-sesion')).toBeNull();
    });

    it('ignores a corrupted stored session', () => {
      const storage = new MemoryStorage();
      storage.setItem('villadent-sesion', '{not json');
      expect(setup(storage).store.session()).toBeNull();
    });
  });
});
