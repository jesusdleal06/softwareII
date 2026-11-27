import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import '../components/unovis-jsdom';
import { ReportDto, ReportHistoryDto } from '../../../core/api/api.types';
import { reportDays, reportRange } from '../../../core/domain';
import { CLOCK } from '../../../core/services/tokens';
import { clickButton, getByText, settle, text, typeInto } from '../../../shared/testing/dom';
import { createFakeStore, FakeStore, provideFakeStore } from '../../../shared/testing/fake-store';
import { ReportsPage } from './reports-page';

const NOW = new Date(2026, 9, 14, 9, 10);

function makeReport(overrides: Partial<ReportDto> = {}): ReportDto {
  return {
    from: '2026-10-12',
    to: '2026-10-17',
    dentistId: null,
    total: 14,
    attended: 10,
    cancelled: 2,
    noShow: 2,
    noShowRate: 17,
    daily: reportDays(...reportRange('semana', NOW)).map((date) => ({
      date,
      total: 2,
      counts: { pending: 0, confirmed: 1, rescheduled: 1, attended: 0, noShow: 0, cancelled: 0 },
    })),
    ...overrides,
  };
}

describe('ReportsPage', () => {
  let fixture: ComponentFixture<ReportsPage>;
  let el: HTMLElement;
  let store: FakeStore;

  beforeEach(async () => {
    store = createFakeStore({ now: NOW });
    store.report.mockResolvedValue(makeReport());
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:report'), revokeObjectURL: vi.fn() });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CLOCK, useValue: () => new Date(NOW) }, provideFakeStore(store)],
    });
    fixture = TestBed.createComponent(ReportsPage);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.unstubAllGlobals());

  function card(title: string): string {
    const card = getByText(el, '[aria-label="Resumen"] > div', title);
    return Array.from(card.children)
      .map((c) => text(c))
      .join(' ');
  }

  function expectMetrics(m: { attended: number; cancelled: number; noShow: number; noShowRate: number }): void {
    expect(card('Pacientes atendidos')).toBe(`Pacientes atendidos ${m.attended}`);
    expect(card('Citas canceladas')).toBe(`Citas canceladas ${m.cancelled}`);
    expect(card('Inasistencias')).toBe(`Inasistencias ${m.noShow}`);
    expect(card('Índice de inasistencia')).toBe(
      `Índice de inasistencia ${m.noShowRate}% ${m.noShow} de ${m.attended + m.noShow} citas finalizadas`,
    );
  }

  async function refresh(): Promise<void> {
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
  }

  function setDate(id: string, value: string): void {
    typeInto(el.querySelector(id) as HTMLInputElement, value);
  }

  /** The chart's accessible data table: one row per day. */
  function chartRows(): HTMLTableRowElement[] {
    return Array.from(el.querySelectorAll<HTMLTableRowElement>('table.chart-table tbody tr'));
  }

  function chartCells(row: HTMLTableRowElement): string[] {
    return Array.from(row.querySelectorAll('th, td')).map((cell) => text(cell));
  }

  function makeHistory(overrides: Partial<ReportHistoryDto> = {}): ReportHistoryDto {
    return {
      id: 1,
      from: '2026-10-01',
      to: '2026-10-31',
      dentistId: null,
      dentistName: null,
      generatedAt: new Date(2026, 9, 20, 14, 30).toISOString(),
      generatedBy: 'Ana Auxiliar',
      ...overrides,
    };
  }

  /** Recreates the page after configuring the history response (the list loads on construction). */
  async function renderWithHistory(entries: ReportHistoryDto[]): Promise<void> {
    store.reportHistory.mockResolvedValue(entries);
    fixture = TestBed.createComponent(ReportsPage);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  it('starts with this week (Monday to Saturday)', () => {
    const [from, to] = reportRange('semana', NOW);
    expect(el.classList).toContain('gap-6');
    expect(text(el)).toContain('Periodo del 12/10/2026 al 17/10/2026');
    expect(getByText(el, 'button', 'Esta semana').getAttribute('aria-pressed')).toBe('true');
    expect(store.report).toHaveBeenCalledWith(from, to, undefined);
    expectMetrics({ attended: 10, cancelled: 2, noShow: 2, noShowRate: 17 });
    expect(chartRows()).toHaveLength(reportDays(from, to).length);
  });

  it('computes the metrics for "Hoy"', async () => {
    store.report.mockResolvedValue(
      makeReport({
        from: '2026-10-14',
        to: '2026-10-14',
        total: 4,
        attended: 2,
        cancelled: 1,
        noShow: 0,
        noShowRate: 0,
        daily: [
          {
            date: '2026-10-14',
            total: 4,
            counts: { pending: 1, confirmed: 2, rescheduled: 1, attended: 0, noShow: 0, cancelled: 0 },
          },
        ],
      }),
    );
    clickButton(el, 'Hoy');
    await refresh();
    expect(text(el)).toContain('Periodo del 14/10/2026 al 14/10/2026');
    expectMetrics({ attended: 2, cancelled: 1, noShow: 0, noShowRate: 0 });
    expect(chartRows()).toHaveLength(1);
    expect(chartCells(chartRows()[0])).toEqual([
      '14/10/2026',
      '1',
      '2',
      '1',
      '0',
      '0',
      '0',
      '4',
    ]);
  });

  it('computes the metrics for "Este mes" and filters by dentist', async () => {
    store.report.mockResolvedValue(
      makeReport({ from: '2026-10-01', to: '2026-10-31', total: 20, attended: 15, cancelled: 3, noShow: 2, noShowRate: 12 }),
    );
    clickButton(el, 'Este mes');
    await refresh();
    expect(text(el)).toContain('Periodo del 01/10/2026 al 31/10/2026');
    expectMetrics({ attended: 15, cancelled: 3, noShow: 2, noShowRate: 12 });

    store.report.mockResolvedValue(
      makeReport({
        from: '2026-10-01',
        to: '2026-10-31',
        dentistId: 1,
        total: 8,
        attended: 6,
        cancelled: 1,
        noShow: 1,
        noShowRate: 14,
      }),
    );
    const select = el.querySelector('#rep-dentista') as HTMLSelectElement;
    select.value = 'd1';
    select.dispatchEvent(new Event('change'));
    await refresh();
    expect(text(el)).toContain('Periodo del 01/10/2026 al 31/10/2026 · Dra. Laura Villamizar');
    expect(store.report).toHaveBeenLastCalledWith('2026-10-01', '2026-10-31', 'd1');
    expectMetrics({ attended: 6, cancelled: 1, noShow: 1, noShowRate: 14 });
  });

  it('shows the empty state for a period without appointments', async () => {
    store.report.mockResolvedValue(makeReport({ from: '2026-11-02', to: '2026-11-07', total: 0, attended: 0, cancelled: 0, noShow: 0, noShowRate: 0, daily: [] }));
    setDate('#desde', '2026-11-02');
    setDate('#hasta', '2026-11-07');
    await refresh();
    expect(getByText(el, 'button', 'Esta semana').getAttribute('aria-pressed')).toBe('false');
    expect(text(el)).toContain('No hay datos para el periodo seleccionado');
    expect(text(el)).toContain('Prueba con otro rango de fechas o quita el filtro de odontólogo.');
    expect(el.querySelector('[aria-label="Resumen"]')).toBeNull();
    expect(getByText<HTMLButtonElement>(el, 'button', 'Exportar').disabled).toBe(true);
  });

  it('shows the error for an invalid range', async () => {
    setDate('#desde', '2026-10-20');
    setDate('#hasta', '2026-10-10');
    await refresh();
    expect(text(el)).toContain('La fecha final debe ser igual o posterior a la inicial.');
    expect(el.querySelector('#hasta')?.getAttribute('aria-invalid')).toBe('true');
    expect(text(el)).toContain('No hay datos para el periodo seleccionado');
  });

  it('exports the report as a CSV file', async () => {
    store.exportReport.mockResolvedValue({ blob: new Blob(['a,b']), filename: 'reporte.csv' });
    clickButton(el, 'Exportar');
    await refresh();
    expect(store.exportReport).toHaveBeenCalledWith('2026-10-12', '2026-10-17', undefined);
    expect(store.exportReportPdf).not.toHaveBeenCalled();
    expect(text(el)).toContain('Archivo CSV descargado.');
  });

  it('CP-RF10-05: downloads the report as a PDF with the current filters', async () => {
    store.exportReportPdf.mockResolvedValue({
      blob: new Blob(['%PDF'], { type: 'application/pdf' }),
      filename: 'reporte-2026-10-12-2026-10-17.pdf',
    });
    clickButton(el, 'Descargar PDF');
    await refresh();
    expect(store.exportReportPdf).toHaveBeenCalledWith('2026-10-12', '2026-10-17', undefined);
    expect(store.exportReport).not.toHaveBeenCalled();
    expect(text(el)).toContain('Archivo PDF descargado.');
    // A successful PDF export refreshes the generated-reports list.
    expect(store.reportHistory).toHaveBeenCalledTimes(2);
  });

  it('CP-RF10-12: lists generated reports newest first with period, dentist, date and author', async () => {
    const older = makeHistory({
      id: 1,
      from: '2026-09-01',
      to: '2026-09-30',
      dentistId: null,
      dentistName: null,
      generatedAt: new Date(2026, 9, 1, 8, 5).toISOString(),
      generatedBy: 'Carlos Auxiliar',
    });
    const newer = makeHistory({
      id: 2,
      from: '2026-10-01',
      to: '2026-10-31',
      dentistId: 1,
      dentistName: 'Dra. Laura Villamizar',
      generatedAt: new Date(2026, 9, 20, 14, 30).toISOString(),
      generatedBy: 'Ana Auxiliar',
    });
    await renderWithHistory([older, newer]);

    const rows = Array.from(el.querySelectorAll<HTMLTableRowElement>('[aria-labelledby="reportes-generados"] tbody tr'));
    expect(rows).toHaveLength(2);
    expect(text(rows[0])).toContain('01/10/2026 al 31/10/2026');
    expect(text(rows[0])).toContain('Dra. Laura Villamizar');
    expect(text(rows[0])).toContain('20/10/2026 14:30');
    expect(text(rows[0])).toContain('Ana Auxiliar');
    expect(text(rows[1])).toContain('01/09/2026 al 30/09/2026');
    expect(text(rows[1])).toContain('Todos');
    expect(text(rows[1])).toContain('01/10/2026 08:05');
    expect(text(rows[1])).toContain('Carlos Auxiliar');
  });

  it('CP-RF10-12: downloads a generated report from its row', async () => {
    await renderWithHistory([makeHistory({ id: 2, from: '2026-10-01', to: '2026-10-31' })]);
    const row = el.querySelector<HTMLTableRowElement>('[aria-labelledby="reportes-generados"] tbody tr');
    expect(row).not.toBeNull();
    const button = row!.querySelector<HTMLButtonElement>('button');
    expect(button?.getAttribute('aria-label')).toBe('Descargar reporte del 01/10/2026 al 31/10/2026');
    button!.click();
    await refresh();
    expect(store.downloadReportPdf).toHaveBeenCalledWith(2, '2026-10-01', '2026-10-31');
  });

  it('CP-RF10-12: shows the empty state when no reports were generated', async () => {
    await renderWithHistory([]);
    expect(text(el)).toContain('Aún no hay reportes generados.');
    expect(el.querySelector('[aria-labelledby="reportes-generados"] table')).toBeNull();
  });
});
