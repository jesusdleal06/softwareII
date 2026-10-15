// Prototype mock dataset. All state is simulated in memory.
import { addDays, mondayOf, toDateKey } from '../domain/dates';
import {
  Appointment,
  AppointmentOrigin,
  AppointmentStatus,
  Clinic,
  Dentist,
  Procedure,
  ReminderStatus,
  Shift,
  User,
} from '../models';

export const CLINIC: Clinic = {
  name: 'Centro Odontológico Villadent',
  shortName: 'Villadent',
  address: 'Calle 45 # 27-18, Bucaramanga',
  phone: '(607) 645 12 34',
  whatsapp: '+57 300 123 4567',
};

export const DENTISTS: readonly Dentist[] = [
  {
    id: 'd1',
    name: 'Dra. Laura Villamizar',
    specialty: 'Odontología general',
    description: 'Odontóloga principal de la clínica',
    initials: 'LV',
  },
  {
    id: 'd2',
    name: 'Dr. Andrés Peña',
    specialty: 'Ortodoncia',
    description: 'Especialista externo',
    initials: 'AP',
  },
  {
    id: 'd3',
    name: 'Dra. Camila Ortiz',
    specialty: 'Cirugía oral',
    description: 'Especialista externa',
    initials: 'CO',
  },
];

export const PROCEDURES: readonly Procedure[] = [
  { id: 'p1', name: 'Limpieza', durationMinutes: 30 },
  { id: 'p2', name: 'Calza (resina)', durationMinutes: 45 },
  { id: 'p3', name: 'Valoración', durationMinutes: 30 },
  { id: 'p4', name: 'Exodoncia', durationMinutes: 60 },
  { id: 'p5', name: 'Instalación de brackets', durationMinutes: 90 },
];

/** Prototype-only credentials (no real authentication). */
export const USERS: readonly User[] = [
  {
    email: 'ana@villadent.co',
    password: 'villadent2024',
    name: 'Ana María Rueda',
    role: 'Auxiliar administrativa',
  },
  {
    email: 'laura@villadent.co',
    password: 'villadent2024',
    name: 'Dra. Laura Villamizar',
    role: 'Odontóloga',
    dentistId: 'd1',
  },
];

/** Opening hours: Monday to Saturday, two shifts. */
export const SHIFTS: readonly Shift[] = [
  { name: 'Mañana', start: 8 * 60, end: 12 * 60 },
  { name: 'Tarde', start: 14 * 60, end: 18 * 60 },
];

export const SLOT_INTERVAL_MINUTES = 30;

/** Demo appointment for the WhatsApp page `/cita/VD-1049` (Rosa Elvira Jaimes, Wednesday afternoon). */
export const DEMO_CODE = 'VD-1049';

interface Seed {
  /** Days after the Monday of the current week. */
  dayOffset: number;
  dentistId: string;
  procedureId: string;
  time: string;
  patientName: string;
  patientPhone: string;
  status?: AppointmentStatus;
  reminder?: ReminderStatus;
  origin?: AppointmentOrigin;
}

const SEEDS: readonly Seed[] = [
  // Monday
  {
    dayOffset: 0,
    dentistId: 'd1',
    procedureId: 'p1',
    time: '08:00',
    patientName: 'María Fernanda López',
    patientPhone: '3001234567',
  },
  {
    dayOffset: 0,
    dentistId: 'd1',
    procedureId: 'p2',
    time: '09:00',
    patientName: 'Jorge Enrique Castro',
    patientPhone: '3109876543',
    status: 'No asistió',
  },
  {
    dayOffset: 0,
    dentistId: 'd2',
    procedureId: 'p5',
    time: '14:00',
    patientName: 'Valentina Suárez',
    patientPhone: '3157654321',
  },
  // Tuesday
  {
    dayOffset: 1,
    dentistId: 'd1',
    procedureId: 'p3',
    time: '10:00',
    patientName: 'Carlos Alberto Rincón',
    patientPhone: '3012223344',
  },
  {
    dayOffset: 1,
    dentistId: 'd3',
    procedureId: 'p4',
    time: '15:00',
    patientName: 'Luz Marina Pérez',
    patientPhone: '3204445566',
    status: 'Cancelada',
    reminder: 'Enviado',
  },
  {
    dayOffset: 1,
    dentistId: 'd1',
    procedureId: 'p1',
    time: '16:30',
    patientName: 'Pedro Pablo Díaz',
    patientPhone: '3176667788',
  },
  // Wednesday
  {
    dayOffset: 2,
    dentistId: 'd1',
    procedureId: 'p1',
    time: '08:30',
    patientName: 'Gloria Inés Mantilla',
    patientPhone: '3118889900',
    status: 'Confirmada',
    reminder: 'Enviado',
  },
  {
    dayOffset: 2,
    dentistId: 'd2',
    procedureId: 'p3',
    time: '10:00',
    patientName: 'Sebastián Gómez',
    patientPhone: '3023334455',
    status: 'Confirmada',
    reminder: 'Enviado',
  },
  {
    dayOffset: 2,
    dentistId: 'd1',
    procedureId: 'p4',
    time: '14:00',
    patientName: 'Rosa Elvira Jaimes',
    patientPhone: '3135556677',
    status: 'Pendiente',
    reminder: 'Programado',
  },
  {
    dayOffset: 2,
    dentistId: 'd3',
    procedureId: 'p4',
    time: '15:30',
    patientName: 'Hernando Ariza',
    patientPhone: '3187778899',
    status: 'Reprogramada',
    reminder: 'Falló',
  },
  // Thursday
  {
    dayOffset: 3,
    dentistId: 'd1',
    procedureId: 'p2',
    time: '09:00',
    patientName: 'Diana Carolina Ruiz',
    patientPhone: '3149990011',
    status: 'Pendiente',
    reminder: 'Programado',
  },
  {
    dayOffset: 3,
    dentistId: 'd2',
    procedureId: 'p5',
    time: '08:00',
    patientName: 'Andrés Felipe Mora',
    patientPhone: '3161112233',
    status: 'Confirmada',
    reminder: 'Programado',
  },
  {
    dayOffset: 3,
    dentistId: 'd1',
    procedureId: 'p1',
    time: '15:00',
    patientName: 'Olga Lucía Torres',
    patientPhone: '3052224455',
    status: 'Pendiente',
    reminder: 'Programado',
    origin: 'Manual',
  },
  // Friday
  {
    dayOffset: 4,
    dentistId: 'd3',
    procedureId: 'p4',
    time: '10:00',
    patientName: 'Miguel Ángel Prada',
    patientPhone: '3193335566',
    status: 'Pendiente',
    reminder: 'Programado',
  },
  {
    dayOffset: 4,
    dentistId: 'd1',
    procedureId: 'p3',
    time: '11:00',
    patientName: 'Camilo Andrés Vera',
    patientPhone: '3004446677',
    status: 'Confirmada',
    reminder: 'Programado',
  },
  // Saturday
  {
    dayOffset: 5,
    dentistId: 'd1',
    procedureId: 'p1',
    time: '09:30',
    patientName: 'Teresa de Jesús Niño',
    patientPhone: '3215557788',
    status: 'Pendiente',
    reminder: 'Programado',
  },
];

/**
 * Builds the mock appointments for the Monday-Saturday week containing `now`.
 * Seeds without an explicit status are `Atendida` when already past and
 * `Pendiente` otherwise, so the data always looks coherent with the date.
 */
export function buildInitialAppointments(now: Date): Appointment[] {
  const monday = mondayOf(now);
  const today = toDateKey(now);

  return SEEDS.map((seed, i) => {
    const date = toDateKey(addDays(monday, seed.dayOffset));
    const status: AppointmentStatus = seed.status ?? (date < today ? 'Atendida' : 'Pendiente');
    const reminder: ReminderStatus =
      seed.reminder ??
      (date < today || status === 'Atendida' || status === 'No asistió' ? 'Enviado' : 'Programado');
    return {
      id: `c${i + 1}`,
      code: `VD-${1041 + i}`,
      dentistId: seed.dentistId,
      procedureId: seed.procedureId,
      date,
      time: seed.time,
      patientName: seed.patientName,
      patientPhone: seed.patientPhone,
      status,
      reminder,
      origin: seed.origin ?? 'Web',
    };
  });
}
