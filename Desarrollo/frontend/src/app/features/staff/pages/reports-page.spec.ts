import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { computeReportMetrics, filterForReport, reportDays, reportRange, ReportFilter } from '../../../core/domain';
import { AppStore } from '../../../core/services/app-store.service';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { clickButton, getByText, text, typeInto } from '../../../shared/testing/dom';
import { ASSISTANT_SESSION, memoryStorage } from '../../../shared/testing/session';
import { ReportsPage } from './reports-page';

const NOW = new Date(2026, 9, 14, 9, 10);

describe('ReportsPage', () => {
  let fixture: ComponentFixture<ReportsPage>;
  let el: HTMLElement;
  let store: AppStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: memoryStorage(ASSISTANT_SESSION) },
      ],
    });
    store = TestBed.inject(AppStore);
    fixture = TestBed.createComponent(ReportsPage);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  function card(title: string): string {
    const card = getByText(el, '[aria-label="Resumen"] > div', title);
    return Array.from(card.children)
      .map((c) => text(c))
      .join(' ');
  }

  function expectMetrics(filter: ReportFilter): void {
    const m = computeReportMetrics(filterForReport(store.appointments(), filter));
    expect(card('Pacientes atendidos')).toBe(`Pacientes atendidos ${m.attended}`);
    expect(card('Citas canceladas')).toBe(`Citas canceladas ${m.cancelled}`);
    expect(card('Inasistencias')).toBe(`Inasistencias ${m.noShow}`);
    expect(card('Índice de inasistencia')).toBe(
      `Índice de inasistencia ${m.noShowRate}% ${m.noShow} de ${m.attended + m.noShow} citas finalizadas`,
    );
  }

  function setDate(id: string, value: string): void {
    typeInto(el.querySelector(id) as HTMLInputElement, value);
    fixture.detectChanges();
  }

  function bars(): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('[aria-label="Gráfico de barras"] [role="img"]'));
  }

  it('starts with this week (Monday to Saturday)', () => {
    const [from, to] = reportRange('semana', NOW);
    expect(el.classList).toContain('gap-6');
    expect(text(el)).toContain('Periodo del 12/10/2026 al 17/10/2026');
    expect(getByText(el, 'button', 'Esta semana').getAttribute('aria-pressed')).toBe('true');
    expectMetrics({ from, to });
    expect(bars()).toHaveLength(reportDays(from, to).length);
  });

  it('computes the metrics for "Hoy"', () => {
    clickButton(el, 'Hoy');
    fixture.detectChanges();
    expect(text(el)).toContain('Periodo del 14/10/2026 al 14/10/2026');
    expectMetrics({ from: '2026-10-14', to: '2026-10-14' });
    expect(bars()).toHaveLength(1);
    // Canonical workflow order (status canon), not the old ad-hoc chart order.
    expect(bars()[0].getAttribute('aria-label')).toBe(
      '14/10/2026: 4 citas. Pendiente: 1, Confirmada: 2, Reprogramada: 1',
    );
    expect(bars()[0].style.height).toBe('100%');
  });

  it('computes the metrics for "Este mes" and filters by dentist', () => {
    clickButton(el, 'Este mes');
    fixture.detectChanges();
    expect(text(el)).toContain('Periodo del 01/10/2026 al 31/10/2026');
    expectMetrics({ from: '2026-10-01', to: '2026-10-31' });

    const select = el.querySelector('#rep-dentista') as HTMLSelectElement;
    select.value = 'd1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(text(el)).toContain('Periodo del 01/10/2026 al 31/10/2026 · Dra. Laura Villamizar');
    expectMetrics({ from: '2026-10-01', to: '2026-10-31', dentistId: 'd1' });
  });

  it('shows the empty state for a period without appointments', () => {
    setDate('#desde', '2026-11-02');
    setDate('#hasta', '2026-11-07');
    expect(getByText(el, 'button', 'Esta semana').getAttribute('aria-pressed')).toBe('false');
    expect(text(el)).toContain('No hay datos para el periodo seleccionado');
    expect(text(el)).toContain('Prueba con otro rango de fechas o quita el filtro de odontólogo.');
    expect(el.querySelector('[aria-label="Resumen"]')).toBeNull();
    expect(getByText<HTMLButtonElement>(el, 'button', 'Exportar').disabled).toBe(true);
  });

  it('shows the error for an invalid range', () => {
    setDate('#desde', '2026-10-20');
    setDate('#hasta', '2026-10-10');
    expect(text(el)).toContain('La fecha final debe ser igual o posterior a la inicial.');
    expect(el.querySelector('#hasta')?.getAttribute('aria-invalid')).toBe('true');
    expect(text(el)).toContain('No hay datos para el periodo seleccionado');
  });

  it('simulates the export', () => {
    clickButton(el, 'Exportar');
    fixture.detectChanges();
    expect(text(el)).toContain('Exportación simulada: en el producto final se descargará un archivo Excel.');
  });
});
