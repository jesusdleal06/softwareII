import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReportDto } from '../../../core/api/api.types';
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

  function bars(): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('[aria-label="Gráfico de barras"] [role="img"]'));
  }

  it('starts with this week (Monday to Saturday)', () => {
    const [from, to] = reportRange('semana', NOW);
    expect(el.classList).toContain('gap-6');
    expect(text(el)).toContain('Periodo del 12/10/2026 al 17/10/2026');
    expect(getByText(el, 'button', 'Esta semana').getAttribute('aria-pressed')).toBe('true');
    expect(store.report).toHaveBeenCalledWith(from, to, undefined);
    expectMetrics({ attended: 10, cancelled: 2, noShow: 2, noShowRate: 17 });
    expect(bars()).toHaveLength(reportDays(from, to).length);
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
    expect(bars()).toHaveLength(1);
    expect(bars()[0].getAttribute('aria-label')).toBe(
      '14/10/2026: 4 citas. Pendiente: 1, Confirmada: 2, Reprogramada: 1',
    );
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
    expect(text(el)).toContain('Archivo CSV descargado.');
  });
});
