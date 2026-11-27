import { computed, signal } from '@angular/core';
import { vi } from 'vitest';
import { DentistProfilePayload, ReportDto, ReportHistoryDto } from '../../core/api/api.types';
import { Appointment, CreateAppointmentResult, Dentist, DentistProfile, Procedure, RescheduleAppointmentResult, Session } from '../../core/models';
import { AppStore } from '../../core/services/app-store.service';
import { makeAppointment } from '../../core/testing/appointment.fixture';
import { ASSISTANT_SESSION } from './session';

export const DENTISTS: Dentist[] = [
  {
    id: 'd1',
    name: 'Dra. Laura Villamizar',
    specialty: 'Odontología general',
    description: 'Acompaña a sus pacientes con tratamientos de ortodoncia y estética dental.',
    initials: 'LV',
    photoUrl: null,
    academicTitles: ['Ortodoncia', 'Estética dental'],
  },
  {
    id: 'd2',
    name: 'Dr. Andrés Peña',
    specialty: 'Ortodoncia',
    description: 'Especialista en ortodoncia con brackets y alineadores.',
    initials: 'AP',
    photoUrl: 'https://example.test/andres.jpg',
    academicTitles: ['Ortodoncia'],
  },
  {
    id: 'd3',
    name: 'Dra. Camila Ortiz',
    specialty: 'Cirugía oral',
    description: 'Cirugía oral y maxilofacial.',
    initials: 'CO',
    photoUrl: null,
    academicTitles: ['Cirugía oral'],
  },
];
export const PROCEDURES: Procedure[] = [
  { id: 'p1', name: 'Limpieza', durationMinutes: 30 },
  { id: 'p2', name: 'Calza (resina)', durationMinutes: 45 },
  { id: 'p3', name: 'Valoración', durationMinutes: 30 },
  { id: 'p4', name: 'Exodoncia', durationMinutes: 60 },
  { id: 'p5', name: 'Instalación de brackets', durationMinutes: 90 },
];

/** Same catalog as the backend demo seed (DemoDataSeeder) and the former prototype data. */
/** Signal-backed AppStore double for component specs; every network method is a vi.fn. */
export function createFakeStore(options: { now?: Date; session?: Session | null; appointments?: Appointment[] } = {}) {
  const now = options.now ?? new Date(2026, 9, 14, 9, 10);
  // Plays the backend: keeps every appointment. `appointmentsState` holds only the last
  // loaded agenda, the way AppStore does with the real API.
  let server: Appointment[] = [...(options.appointments ?? [])];
  const appointmentsState = signal<Appointment[]>([...server]);
  const saveOnServer = (changed: Appointment): void => {
    server = server.some((a) => a.id === changed.id)
      ? server.map((a) => (a.id === changed.id ? changed : a))
      : [...server, changed];
    appointmentsState.update((list) => list.map((a) => (a.id === changed.id ? changed : a)));
  };
  const dentistsState = signal<Dentist[]>([...DENTISTS]);
  const proceduresState = signal<Procedure[]>([...PROCEDURES]);
  const sessionState = signal<Session | null>(options.session === undefined ? ASSISTANT_SESSION : options.session);

  let profile: DentistProfile = {
    id: 'd1',
    firstName: 'Laura',
    secondName: null,
    firstSurname: 'Villamizar',
    secondSurname: null,
    fullName: 'Laura Villamizar',
    specialty: 'Odontología general',
    photoUrl: null,
    academicTitles: ['Ortodoncia', 'Estética dental'],
    description: 'Acompaña a sus pacientes con tratamientos de ortodoncia y estética dental.',
  };

  const store = {
    appointmentsState,
    dentistsState,
    proceduresState,
    sessionState,
    appointments: appointmentsState.asReadonly(),
    dentists: dentistsState.asReadonly(),
    procedures: proceduresState.asReadonly(),
    session: sessionState.asReadonly(),
    isAuthenticated: computed(() => sessionState() !== null),
    now: () => new Date(now),
    dentistById: (id: string) => dentistsState().find((d) => d.id === id),
    procedureById: (id: string) => proceduresState().find((p) => p.id === id),
    ensureCatalogs: vi.fn(async () => undefined),
    dentistProfile: vi.fn(async (): Promise<DentistProfile> => profile),
    saveDentistProfile: vi.fn(async (payload: DentistProfilePayload): Promise<DentistProfile> => {
      profile = {
        ...profile,
        firstName: payload.firstName,
        secondName: payload.secondName,
        firstSurname: payload.firstSurname,
        secondSurname: payload.secondSurname,
        fullName: [payload.firstName, payload.secondName, payload.firstSurname, payload.secondSurname]
          .filter((part): part is string => Boolean(part && part.trim()))
          .join(' '),
        academicTitles: payload.academicTitles,
        description: payload.description,
      };
      return profile;
    }),
    uploadDentistPhoto: vi.fn(async (): Promise<DentistProfile> => {
      profile = { ...profile, photoUrl: 'https://example.test/perfil.jpg' };
      return profile;
    }),
    login: vi.fn(async () => sessionState()),
    logout: vi.fn(),
    loadAgenda: vi.fn(async (date: string, dentistId?: string) => {
      appointmentsState.set(server.filter((a) => a.date === date && (!dentistId || a.dentistId === dentistId)));
    }),
    availability: vi.fn(async (_dentistId: string, _procedureId: string, _date: string): Promise<string[]> => [
      '09:00',
      '10:00',
      '11:00',
      '15:00',
    ]),
    createAppointment: vi.fn(async (input: { date: string; time: string }): Promise<CreateAppointmentResult> => ({
      ok: true as const,
      appointment: makeAppointment({ id: 'new', date: input.date, time: input.time, code: 'VD-3000' }),
    })),
    rescheduleAppointment: vi.fn(async (id: string, date: string, time: string): Promise<RescheduleAppointmentResult> => {
      const current = server.find((a) => a.id === id) ?? makeAppointment({ id });
      const changed = { ...current, date, time, status: 'Reprogramada' as const };
      saveOnServer(changed);
      return { ok: true as const, appointment: changed };
    }),
    changeStatus: vi.fn(async (id: string, status: Appointment['status']): Promise<Appointment> => {
      const current = server.find((a) => a.id === id) ?? makeAppointment({ id });
      const changed = { ...current, status };
      saveOnServer(changed);
      return changed;
    }),
    confirm: vi.fn(async (id: string) => store.changeStatus(id, 'Confirmada')),
    cancel: vi.fn(async (id: string) => store.changeStatus(id, 'Cancelada')),
    managed: vi.fn(async (_token: string) => null as Appointment | null),
    confirmManaged: vi.fn(async () => makeAppointment()),
    cancelManaged: vi.fn(async () => makeAppointment({ status: 'Cancelada' })),
    rescheduleManaged: vi.fn(async (_token: string, date: string, time: string) =>
      makeAppointment({ date, time, status: 'Reprogramada' }),
    ),
    report: vi.fn(async (_from: string, _to: string, _dentistId?: string): Promise<ReportDto> => ({
      from: '',
      to: '',
      dentistId: null,
      total: 0,
      attended: 0,
      cancelled: 0,
      noShow: 0,
      noShowRate: 0,
      daily: [],
    })),
    exportReport: vi.fn(async () => ({ blob: new Blob(['']), filename: 'reporte.csv' })),
    exportReportPdf: vi.fn(async () => ({ blob: new Blob(['']), filename: 'reporte.pdf' })),
    reportHistory: vi.fn(async (): Promise<ReportHistoryDto[]> => []),
    downloadReportPdf: vi.fn(async (_id: number, from: string, to: string) => ({
      blob: new Blob(['']),
      filename: `reporte-${from}-${to}.pdf`,
    })),
  };
  return store;
}

export type FakeStore = ReturnType<typeof createFakeStore>;

export function provideFakeStore(store: FakeStore): { provide: typeof AppStore; useValue: AppStore } {
  return { provide: AppStore, useValue: store as unknown as AppStore };
}
