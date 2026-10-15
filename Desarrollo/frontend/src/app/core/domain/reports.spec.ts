import {
  computeReportMetrics,
  dailyBreakdown,
  filterForReport,
  reportDays,
  reportRange,
} from './reports';
import { makeAppointment } from '../testing/appointment.fixture';

const NOW = new Date(2026, 9, 14, 9, 10);

describe('reports', () => {
  const appointments = [
    makeAppointment({ id: '1', date: '2026-10-12', status: 'Atendida', dentistId: 'd1' }),
    makeAppointment({ id: '2', date: '2026-10-12', status: 'No asistió', dentistId: 'd1' }),
    makeAppointment({ id: '3', date: '2026-10-13', status: 'Atendida', dentistId: 'd2' }),
    makeAppointment({ id: '4', date: '2026-10-13', status: 'Cancelada', dentistId: 'd1' }),
    makeAppointment({ id: '5', date: '2026-10-15', status: 'Pendiente', dentistId: 'd1' }),
    makeAppointment({ id: '6', date: '2026-10-20', status: 'Atendida', dentistId: 'd1' }),
  ];

  it('filters by inclusive date range and optional dentist', () => {
    expect(
      filterForReport(appointments, { from: '2026-10-12', to: '2026-10-15' }).map((a) => a.id),
    ).toEqual(['1', '2', '3', '4', '5']);
    expect(
      filterForReport(appointments, { from: '2026-10-12', to: '2026-10-15', dentistId: 'd2' }).map(
        (a) => a.id,
      ),
    ).toEqual(['3']);
  });

  it('computes attended, cancelled, no-show and the no-show rate over finished appointments', () => {
    const inRange = filterForReport(appointments, { from: '2026-10-12', to: '2026-10-15' });
    expect(computeReportMetrics(inRange)).toEqual({
      total: 5,
      attended: 2,
      cancelled: 1,
      noShow: 1,
      noShowRate: 33,
    });
  });

  it('reports a 0% no-show rate when nothing has finished', () => {
    expect(computeReportMetrics([makeAppointment({ status: 'Pendiente' })]).noShowRate).toBe(0);
  });

  it('lists the days in range skipping Sundays, capped at 62 iterations', () => {
    expect(reportDays('2026-10-17', '2026-10-19')).toEqual(['2026-10-17', '2026-10-19']);
    expect(reportDays('2026-01-01', '2026-12-31')).toHaveLength(53);
    expect(reportDays('2026-10-20', '2026-10-19')).toEqual([]);
  });

  it('breaks down appointments per day and status', () => {
    const [monday] = dailyBreakdown(appointments, ['2026-10-12']);
    expect(monday.date).toBe('2026-10-12');
    expect(monday.total).toBe(2);
    expect(monday.counts['Atendida']).toBe(1);
    expect(monday.counts['No asistió']).toBe(1);
    expect(monday.counts['Cancelada']).toBe(0);
  });

  it('resolves the quick ranges relative to now', () => {
    expect(reportRange('hoy', NOW)).toEqual(['2026-10-14', '2026-10-14']);
    expect(reportRange('semana', NOW)).toEqual(['2026-10-12', '2026-10-17']);
    expect(reportRange('mes', NOW)).toEqual(['2026-10-01', '2026-10-31']);
    expect(reportRange('30', NOW)).toEqual(['2026-09-15', '2026-10-14']);
  });
});
