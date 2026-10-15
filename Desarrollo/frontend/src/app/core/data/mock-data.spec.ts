import {
  buildInitialAppointments,
  DEMO_CODE,
  DENTISTS,
  PROCEDURES,
  SHIFTS,
  USERS,
} from './mock-data';

describe('mock data', () => {
  // Wednesday 2026-10-14: Monday 12 and Tuesday 13 are in the past.
  const NOW = new Date(2026, 9, 14, 9, 10);
  const appointments = buildInitialAppointments(NOW);

  it('exposes the prototype catalog', () => {
    expect(DENTISTS.map((d) => d.id)).toEqual(['d1', 'd2', 'd3']);
    expect(PROCEDURES.map((p) => p.durationMinutes)).toEqual([30, 45, 30, 60, 90]);
    expect(USERS.map((u) => u.role)).toEqual(['Auxiliar administrativa', 'Odontóloga']);
    expect(SHIFTS).toEqual([
      { name: 'Mañana', start: 480, end: 720 },
      { name: 'Tarde', start: 840, end: 1080 },
    ]);
  });

  it('seeds 16 appointments across the current Monday-Saturday week', () => {
    expect(appointments).toHaveLength(16);
    expect(appointments[0]).toMatchObject({
      id: 'c1',
      code: 'VD-1041',
      date: '2026-10-12',
      time: '08:00',
    });
    expect(appointments[15]).toMatchObject({ id: 'c16', code: 'VD-1056', date: '2026-10-17' });
  });

  it('marks past seeds without explicit status as attended with the reminder sent', () => {
    expect(appointments[0]).toMatchObject({ status: 'Atendida', reminder: 'Enviado' });
    expect(appointments[1]).toMatchObject({ status: 'No asistió', reminder: 'Enviado' });
    expect(appointments[4]).toMatchObject({ status: 'Cancelada', reminder: 'Enviado' });
  });

  it('keeps explicit statuses and defaults origin to Web', () => {
    expect(appointments[9]).toMatchObject({
      status: 'Reprogramada',
      reminder: 'Falló',
      origin: 'Web',
    });
    expect(appointments[12].origin).toBe('Manual');
  });

  it('uses VD-1049 (Rosa Elvira Jaimes) as the WhatsApp demo code', () => {
    expect(DEMO_CODE).toBe('VD-1049');
    expect(appointments[8]).toMatchObject({ code: DEMO_CODE, patientName: 'Rosa Elvira Jaimes' });
  });
});
