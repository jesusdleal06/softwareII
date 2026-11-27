import { ComponentFixture, TestBed } from '@angular/core/testing';
import './unovis-jsdom';
import { DailyBreakdown } from '../../../core/domain';
import { REPORT_SERIES } from '../../../core/data/status-styles';
import { text } from '../../../shared/testing/dom';
import { ReportChart } from './report-chart';

function emptyCounts() {
  return { Pendiente: 0, Confirmada: 0, Reprogramada: 0, Atendida: 0, 'No asistió': 0, Cancelada: 0 };
}

const DAYS: readonly DailyBreakdown[] = [
  {
    date: '2026-10-14',
    total: 4,
    counts: { ...emptyCounts(), Pendiente: 1, Confirmada: 2, Reprogramada: 1 },
  },
  {
    date: '2026-10-15',
    total: 3,
    counts: { ...emptyCounts(), Confirmada: 1, Atendida: 1, 'No asistió': 1 },
  },
];

function cellTexts(row: HTMLTableRowElement): string[] {
  return Array.from(row.querySelectorAll('th, td')).map((cell) => text(cell));
}

describe('ReportChart', () => {
  let fixture: ComponentFixture<ReportChart>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ReportChart);
    fixture.componentRef.setInput('days', DAYS);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('keeps the chart heading and legend order from the status canon', () => {
    expect(text(el.querySelector('h2') as HTMLElement)).toBe('Citas por día según estado');
    const items = Array.from(el.querySelectorAll<HTMLLIElement>('[aria-label="Leyenda"] li'));
    expect(items).toHaveLength(REPORT_SERIES.length);
    expect(items.map((item) => text(item).replace(/\s+/g, ' '))).toEqual([
      'Pendiente 1',
      'Confirmada 3',
      'Reprogramada 1',
      'Atendida 1',
      'No asistió 1',
      'Cancelada 0',
    ]);
  });

  it('describes the period of the data', () => {
    expect(text(el)).toContain('Periodo: 14/10/2026 al 15/10/2026');
  });

  it('renders the chart region with an accessible name', () => {
    expect(el.querySelector('[aria-label="Gráfico de barras"]')).not.toBeNull();
    expect(el.querySelector('vis-xy-container')).not.toBeNull();
  });

  it('uses solid fills, with no decorative pattern in the bars or the legend', () => {
    expect(el.querySelector('pattern, [mask], [style*="mask"]')).toBeNull();
    const swatches = el.querySelectorAll('[aria-label="Leyenda"] rect');
    expect(swatches).toHaveLength(REPORT_SERIES.length);
    for (const swatch of Array.from(swatches)) {
      expect(swatch.getAttribute('mask')).toBeNull();
      expect(swatch.getAttribute('style')).not.toContain('mask');
    }
  });

  it('never animates the chart', () => {
    const chart = fixture.componentInstance as unknown as { duration: number };
    expect(chart.duration).toBe(0);
  });

  it('labels every bar with its total above the bars', () => {
    const chart = fixture.componentInstance as unknown as {
      rows: () => readonly { total: number }[];
      totalTick: (tick: number) => string;
    };
    expect(chart.rows().map((_row, index) => chart.totalTick(index))).toEqual(['4', '3']);
    // Top axis for the totals, bottom axis for the days, left axis for the counts.
    expect(el.querySelectorAll('vis-axis')).toHaveLength(3);
  });

  it('offers the same numbers as a table with Spanish headers', () => {
    const table = el.querySelector('table.chart-table') as HTMLTableElement;
    expect(table).not.toBeNull();
    expect(text(table.querySelector('caption') as HTMLElement)).toBe('Citas por día según estado');
    const headers = Array.from(table.querySelectorAll('thead th')).map((cell) => text(cell));
    expect(headers).toEqual(['Día', ...REPORT_SERIES.map((series) => series.label), 'Total']);
  });

  it('lists one row per day with every series count and the total', () => {
    const rows = Array.from(el.querySelectorAll<HTMLTableRowElement>('table.chart-table tbody tr'));
    expect(rows).toHaveLength(DAYS.length);
    expect(cellTexts(rows[0])).toEqual(['14/10/2026', '1', '2', '1', '0', '0', '0', '4']);
    expect(cellTexts(rows[1])).toEqual(['15/10/2026', '0', '1', '0', '1', '1', '0', '3']);
  });
});
