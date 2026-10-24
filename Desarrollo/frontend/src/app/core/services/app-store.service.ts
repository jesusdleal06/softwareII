import { computed, inject, Injectable, signal } from '@angular/core';
import { mapDentist, mapManagedAppointment, mapProcedure, mapPublicAppointment, mapRole, mapStaffAppointment } from '../api/adapters';
import { ApiError } from '../api/api-error';
import { ClinicApi } from '../api/clinic-api';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentResult,
  Dentist,
  NewAppointmentInput,
  Procedure,
  RescheduleAppointmentResult,
  Session,
} from '../models';
import { CLOCK, SESSION_STORAGE } from './tokens';

const SESSION_KEY = 'villadent-sesion';

/**
 * Session, catalogs and the currently loaded agenda. Every mutation goes to the API;
 * screens read signals and call the async methods. No prototype data lives here.
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly api = inject(ClinicApi);
  private readonly clock = inject(CLOCK);
  private readonly storage = inject(SESSION_STORAGE);

  private readonly appointmentsState = signal<Appointment[]>([]);
  private readonly dentistsState = signal<Dentist[]>([]);
  private readonly proceduresState = signal<Procedure[]>([]);
  private readonly sessionState = signal<Session | null>(this.restoreSession());

  readonly appointments = this.appointmentsState.asReadonly();
  readonly dentists = this.dentistsState.asReadonly();
  readonly procedures = this.proceduresState.asReadonly();
  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  constructor() {
    this.api.setToken(this.sessionState()?.token ?? null);
  }

  /** Current instant from the injected clock. */
  now(): Date {
    return this.clock();
  }

  dentistById(id: string): Dentist | undefined {
    return this.dentistsState().find((d) => d.id === id);
  }

  procedureById(id: string): Procedure | undefined {
    return this.proceduresState().find((p) => p.id === id);
  }

  async ensureCatalogs(): Promise<void> {
    if (this.dentistsState().length > 0 && this.proceduresState().length > 0) return;
    const [dentists, procedures] = await Promise.all([this.api.dentists(), this.api.procedures()]);
    // The public endpoints already list active records only, without an `active` flag.
    this.dentistsState.set(dentists.map(mapDentist));
    this.proceduresState.set(procedures.map(mapProcedure));
  }

  /** Returns the session, or `null` for rejected credentials. Other failures are thrown. */
  async login(email: string, password: string): Promise<Session | null> {
    let response;
    try {
      response = await this.api.login(email.trim().toLowerCase(), password);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
      throw error;
    }
    this.api.setToken(response.token);
    await this.ensureCatalogs().catch(() => undefined);
    // Only the staff endpoint links a dentist record to its user account.
    const dentistId =
      response.user.role === 'ODONTOLOGO'
        ? (await this.api.staffDentists()).find((d) => d.userId === response.user.id)?.id
        : undefined;
    const session: Session = {
      email: response.user.email,
      name: response.user.name,
      role: mapRole(response.user.role),
      userId: String(response.user.id),
      dentistId: dentistId == null ? undefined : String(dentistId),
      token: response.token,
    };
    this.sessionState.set(session);
    this.writeStorage(() => this.storage?.setItem(SESSION_KEY, JSON.stringify(session)));
    return session;
  }

  logout(): void {
    this.sessionState.set(null);
    this.appointmentsState.set([]);
    this.api.setToken(null);
    this.writeStorage(() => this.storage?.removeItem(SESSION_KEY));
  }

  async loadAgenda(date: string, dentistId?: string): Promise<void> {
    const appointments = await this.api.agenda(date, dentistId);
    this.appointmentsState.set(appointments.map(mapStaffAppointment));
  }

  async availability(dentistId: string, procedureId: string, date: string): Promise<string[]> {
    if (!dentistId || !procedureId || !date) return [];
    const response = await this.api.availability(dentistId, procedureId, date);
    return response.slots;
  }

  async createAppointment(input: NewAppointmentInput): Promise<CreateAppointmentResult> {
    // The backend is authoritative for dentist, procedure, duration and conflicts.
    const payload = {
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      dentistId: Number(input.dentistId),
      procedureId: Number(input.procedureId),
      date: input.date,
      time: input.time,
    };
    try {
      if (input.origin === 'Manual') {
        const created = mapStaffAppointment(await this.api.bookStaff(payload));
        this.upsert(created);
        return { ok: true, appointment: created };
      }
      const created = mapPublicAppointment(
        await this.api.bookPublic(payload),
        input.patientName,
        input.patientPhone,
      );
      return { ok: true, appointment: created };
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === 'ACTIVE_APPOINTMENT_EXISTS') {
        return { ok: false, reason: 'cita-activa' };
      }
      if (error.code === 'SLOT_TAKEN') return { ok: false, reason: 'conflicto' };
      throw error;
    }
  }

  async rescheduleAppointment(
    id: string,
    date: string,
    time: string,
  ): Promise<RescheduleAppointmentResult> {
    try {
      const changed = mapStaffAppointment(await this.api.rescheduleStaff(id, date, time));
      this.upsert(changed);
      return { ok: true, appointment: changed };
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SLOT_TAKEN') {
        return { ok: false, reason: 'conflicto' };
      }
      throw error;
    }
  }

  async changeStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const changed = mapStaffAppointment(await this.api.changeStatus(id, toApiStatus(status)));
    this.upsert(changed);
    return changed;
  }

  async confirm(id: string): Promise<Appointment> {
    return this.changeStatus(id, 'Confirmada');
  }

  async cancel(id: string): Promise<Appointment> {
    return this.changeStatus(id, 'Cancelada');
  }

  async managed(token: string): Promise<Appointment | null> {
    try {
      return mapManagedAppointment(await this.api.managed(token));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async confirmManaged(token: string): Promise<Appointment> {
    return mapManagedAppointment(await this.api.confirmManaged(token));
  }

  async cancelManaged(token: string): Promise<Appointment> {
    return mapManagedAppointment(await this.api.cancelManaged(token));
  }

  async rescheduleManaged(token: string, date: string, time: string): Promise<Appointment> {
    return mapManagedAppointment(await this.api.rescheduleManaged(token, date, time));
  }

  async report(from: string, to: string, dentistId?: string) {
    return this.api.report({ from, to, dentistId });
  }

  async exportReport(from: string, to: string, dentistId?: string) {
    return this.api.exportReport({ from, to, dentistId });
  }

  private upsert(appointment: Appointment): void {
    this.appointmentsState.update((list) => {
      const index = list.findIndex((a) => a.id === appointment.id);
      if (index === -1) return [...list, appointment];
      return list.map((a) => (a.id === appointment.id ? appointment : a));
    });
  }

  private restoreSession(): Session | null {
    try {
      const saved = this.storage?.getItem(SESSION_KEY);
      if (!saved) return null;
      const session = JSON.parse(saved) as Session;
      return session.token ? session : null;
    } catch {
      return null;
    }
  }

  private writeStorage(write: () => void): void {
    try {
      write();
    } catch {
      // Storage may be unavailable (private mode, quota); the in-memory session still works.
    }
  }
}

function toApiStatus(status: AppointmentStatus): string {
  switch (status) {
    case 'Pendiente':
      return 'PENDIENTE';
    case 'Confirmada':
      return 'CONFIRMADA';
    case 'Cancelada':
      return 'CANCELADA';
    case 'Reprogramada':
      return 'REPROGRAMADA';
    case 'Atendida':
      return 'ATENDIDA';
    case 'No asistió':
      return 'NO_ASISTIO';
  }
}
