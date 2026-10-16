import { Appointment } from '../models';
import { isActiveStatus } from './availability';
import { toDateKey } from './dates';

export interface PatientData {
  name: string;
  phone: string;
}

export type PatientErrors = Partial<Record<keyof PatientData, string>>;

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** Colombian mobile: exactly 10 digits starting with 3. */
export function isValidPhone(value: string): boolean {
  return /^3\d{9}$/.test(normalizePhone(value));
}

/** `3001234567` → `300 123 4567`; anything that is not 10 digits is returned as is. */
export function formatPhone(value: string): string {
  const d = normalizePhone(value);
  if (d.length !== 10) return value;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** Field errors with the prototype's Spanish messages; empty object when valid. */
export function validatePatient(data: PatientData): PatientErrors {
  const errors: PatientErrors = {};
  const name = data.name.trim();
  if (!name) errors.name = 'El nombre completo es obligatorio.';
  else if (name.split(/\s+/).length < 2) errors.name = 'Escribe nombre y apellido.';

  const phone = normalizePhone(data.phone);
  if (!phone) errors.phone = 'El número de celular es obligatorio.';
  else if (phone.length !== 10) errors.phone = 'El celular debe tener 10 dígitos.';
  else if (!isValidPhone(phone))
    errors.phone = 'Escribe un celular colombiano válido (empieza por 3).';
  return errors;
}

/** The patient's active appointment dated today or later, if any (one per phone). */
export function findActiveAppointment(
  phone: string,
  appointments: readonly Appointment[],
  now: Date,
  excludeAppointmentId?: string,
): Appointment | undefined {
  const normalized = normalizePhone(phone);
  const today = toDateKey(now);
  return appointments.find(
    (a) =>
      a.id !== excludeAppointmentId &&
      normalizePhone(a.patientPhone) === normalized &&
      isActiveStatus(a.status) &&
      a.date >= today,
  );
}
