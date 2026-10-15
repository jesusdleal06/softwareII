import { computed, inject, Injectable, signal } from '@angular/core';
import { buildInitialAppointments, USERS } from '../data/mock-data';
import { generateCode } from '../domain/appointment-code';
import { availableSlots, isSlotAvailable, SlotQuery } from '../domain/availability';
import { durationOf } from '../domain/catalog';
import { findActiveAppointment } from '../domain/patient';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentResult,
  NewAppointmentInput,
  RescheduleAppointmentResult,
  Session,
} from '../models';
import { CLOCK, SESSION_STORAGE } from './tokens';

const SESSION_KEY = 'villadent-sesion';

/**
 * In-memory application state for the prototype: appointments and the staff
 * session. Business rules live in `core/domain`; this service only applies them
 * and is meant to be replaced by HTTP calls to the backend later.
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly clock = inject(CLOCK);
  private readonly storage = inject(SESSION_STORAGE);
  private idSequence = 0;

  private readonly appointmentsState = signal<Appointment[]>(
    buildInitialAppointments(this.clock()),
  );
  private readonly sessionState = signal<Session | null>(this.restoreSession());

  readonly appointments = this.appointmentsState.asReadonly();
  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  /** Current instant from the injected clock. */
  now(): Date {
    return this.clock();
  }

  login(email: string, password: string): Session | null {
    const user = USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!user) return null;
    const { password: _password, ...session } = user;
    this.sessionState.set(session);
    this.writeStorage(() => this.storage?.setItem(SESSION_KEY, JSON.stringify(session)));
    return session;
  }

  logout(): void {
    this.sessionState.set(null);
    this.writeStorage(() => this.storage?.removeItem(SESSION_KEY));
  }

  /** Free start times for a dentist, using the current appointments and clock. */
  availableSlots(query: Omit<SlotQuery, 'appointments' | 'now'>): string[] {
    return availableSlots({ ...query, appointments: this.appointmentsState(), now: this.clock() });
  }

  /** The patient's active appointment from today onwards, if any. */
  activeAppointmentFor(phone: string): Appointment | undefined {
    return findActiveAppointment(phone, this.appointmentsState(), this.clock());
  }

  createAppointment(input: NewAppointmentInput): CreateAppointmentResult {
    const now = this.clock();
    const appointments = this.appointmentsState();

    const active = findActiveAppointment(input.patientPhone, appointments, now);
    if (active) return { ok: false, reason: 'cita-activa', activeAppointment: active };

    const free = isSlotAvailable({
      ...input,
      durationMinutes: durationOf(input),
      appointments,
      now,
    });
    if (!free) return { ok: false, reason: 'conflicto' };

    const appointment: Appointment = {
      id: `c${now.getTime()}-${++this.idSequence}`,
      code: generateCode(appointments),
      ...input,
      status: 'Pendiente',
      reminder: 'Programado',
    };
    this.appointmentsState.update((list) => [...list, appointment]);
    return { ok: true, appointment };
  }

  rescheduleAppointment(id: string, date: string, time: string): RescheduleAppointmentResult {
    const appointments = this.appointmentsState();
    const current = appointments.find((a) => a.id === id);
    if (!current) return { ok: false, reason: 'conflicto' };

    const free = isSlotAvailable({
      dentistId: current.dentistId,
      date,
      time,
      durationMinutes: durationOf(current),
      appointments,
      now: this.clock(),
      excludeAppointmentId: id,
    });
    if (!free) return { ok: false, reason: 'conflicto' };

    const appointment: Appointment = {
      ...current,
      date,
      time,
      status: 'Reprogramada',
      reminder: 'Programado',
    };
    this.appointmentsState.update((list) => list.map((a) => (a.id === id ? appointment : a)));
    return { ok: true, appointment };
  }

  changeStatus(id: string, status: AppointmentStatus): void {
    this.appointmentsState.update((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  confirm(id: string): void {
    this.changeStatus(id, 'Confirmada');
  }

  cancel(id: string): void {
    this.changeStatus(id, 'Cancelada');
  }

  markAttended(id: string): void {
    this.changeStatus(id, 'Atendida');
  }

  markNoShow(id: string): void {
    this.changeStatus(id, 'No asistió');
  }

  appointmentByCode(code: string): Appointment | undefined {
    const wanted = code.toLowerCase();
    return this.appointmentsState().find((a) => a.code.toLowerCase() === wanted);
  }

  private restoreSession(): Session | null {
    try {
      const saved = this.storage?.getItem(SESSION_KEY);
      return saved ? (JSON.parse(saved) as Session) : null;
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
