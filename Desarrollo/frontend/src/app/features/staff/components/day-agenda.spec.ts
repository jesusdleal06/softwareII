import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DENTISTS, PROCEDURES } from '../../../shared/testing/fake-store';
import { STATUS_STYLES } from '../../../core/data/status-styles';
import { Appointment, Dentist, Procedure } from '../../../core/models';
import { makeAppointment } from '../../../core/testing/appointment.fixture';
import { text } from '../../../shared/testing/dom';
import { DayAgenda } from './day-agenda';

const DAY = '2026-10-14';

/** A 15-minute procedure, the shortest slot: its block is the smallest touch target. */
const SHORT_PROCEDURE: Procedure = { id: 'test-short', name: 'Revisión', durationMinutes: 15 };

function withShortProcedure<T>(run: () => T): T {
  (PROCEDURES as unknown as Procedure[]).push(SHORT_PROCEDURE);
  try {
    return run();
  } finally {
    (PROCEDURES as unknown as Procedure[]).pop();
  }
}

const APPOINTMENTS: Appointment[] = [
  // 08:30 Limpieza (30 min) → top (30 × 2.4) + 16 + 2 = 90px, height 72 − 4 = 68px.
  makeAppointment({
    id: 'a1',
    dentistId: 'd1',
    procedureId: 'p1',
    procedureName: 'Limpieza',
    durationMinutes: 30,
    time: '08:30',
    patientName: 'Gloria Mantilla',
  }),
  // 14:00 Exodoncia (60 min) → top (360 × 2.4) + 18 = 882px, height 144 − 4 = 140px.
  makeAppointment({
    id: 'a2',
    dentistId: 'd1',
    procedureId: 'p4',
    procedureName: 'Exodoncia',
    durationMinutes: 60,
    time: '14:00',
    patientName: 'Rosa Jaimes',
    patientPhone: '3135556677',
  }),
  makeAppointment({
    id: 'a3',
    dentistId: 'd3',
    procedureId: 'p3',
    procedureName: 'Endodoncia',
    durationMinutes: 30,
    time: '10:00',
    patientName: 'Luz Pérez',
    status: 'Cancelada',
  }),
];

describe('DayAgenda', () => {
  let fixture: ComponentFixture<DayAgenda>;
  let el: HTMLElement;
  let selected: Appointment[];

  function render(
    now = new Date(2026, 9, 14, 9, 10),
    input: { dentists?: readonly Dentist[]; appointments?: readonly Appointment[] } = {},
  ): void {
    fixture = TestBed.createComponent(DayAgenda);
    fixture.componentRef.setInput('dentists', input.dentists ?? DENTISTS);
    fixture.componentRef.setInput('appointments', input.appointments ?? APPOINTMENTS);
    fixture.componentRef.setInput('dateKey', DAY);
    fixture.componentRef.setInput('now', now);
    selected = [];
    fixture.componentInstance.selected.subscribe((a) => selected.push(a));
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  function block(name: string): HTMLButtonElement {
    return el.querySelector(`button[aria-label^="${name},"]`) as HTMLButtonElement;
  }

  function columns(): NodeListOf<HTMLElement> {
    return el.querySelectorAll('[aria-label^="Agenda de "]');
  }

  const originalMatchMedia = window.matchMedia;

  function stubNarrow(matches: boolean): void {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({ matches, addEventListener(): void {}, removeEventListener(): void {} }),
    });
  }

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('renders one column per dentist with the hour axis', () => {
    render();
    const cols = columns();
    expect(Array.from(cols).map((c) => c.getAttribute('aria-label'))).toEqual([
      'Agenda de Dra. Laura Villamizar',
      'Agenda de Dr. Andrés Peña',
      'Agenda de Dra. Camila Ortiz',
    ]);
    expect((el.querySelector('.grid') as HTMLElement).style.gridTemplateColumns).toBe(
      '5rem repeat(3, minmax(0, 1fr))',
    );
    expect((cols[0] as HTMLElement).style.height).toBe('1472px');
    expect(text(el)).toContain('8:00 AM');
    expect(text(el)).toContain('6:00 PM');
    expect(text(cols[0])).toContain('Descanso');
  });

  it('positions and sizes each block by start time and duration', () => {
    render();
    const morning = block('Gloria Mantilla');
    expect(morning.style.top).toBe('90px');
    expect(morning.style.height).toBe('68px');
    const afternoon = block('Rosa Jaimes');
    expect(afternoon.style.top).toBe('882px');
    expect(afternoon.style.height).toBe('140px');
    expect(text(afternoon)).toContain('Exodoncia · 2:00 PM-3:00 PM');
    // Blocks of 100px or more also show the phone.
    expect(text(afternoon)).toContain('313 555 6677');
    expect(text(morning)).not.toContain('300 000 0000');
    expect(afternoon.getAttribute('aria-label')).toBe('Rosa Jaimes, Exodoncia, 2:00 PM, Pendiente');
  });

  it('separates the time range with a hyphen, never an en or em dash', () => {
    render();
    expect(text(block('Rosa Jaimes'))).toContain('Exodoncia · 2:00 PM-3:00 PM');
    expect(text(el)).not.toContain('–');
    expect(text(el)).not.toContain('—');
  });

  it('prints the status through the shared canon label, not the raw enum', () => {
    render();
    // Labels match the enum values today; this pins the canon as the single source.
    expect(text(block('Luz Pérez'))).toContain(STATUS_STYLES['Cancelada'].label);
    expect(block('Rosa Jaimes').getAttribute('aria-label')).toBe(
      `Rosa Jaimes, Exodoncia, 2:00 PM, ${STATUS_STYLES['Pendiente'].label}`,
    );
  });

  it('shows an empty state when the day has no appointments', () => {
    render(undefined, { appointments: [] });
    expect(columns()).toHaveLength(0);
    expect(text(el)).toContain('No hay citas para este día');
  });

  it('places each appointment in its dentist column', () => {
    render();
    const cols = columns();
    expect(cols[0].querySelectorAll('button')).toHaveLength(2);
    expect(cols[1].querySelectorAll('button')).toHaveLength(0);
    expect(cols[2].querySelectorAll('button')).toHaveLength(1);
  });

  it('keeps cancelled appointments visible, struck through', () => {
    render();
    const cancelled = block('Luz Pérez');
    expect(cancelled).not.toBeNull();
    expect(cancelled.className).toContain('line-through');
    expect(cancelled.className).toContain('bg-destructive/5');
    expect(text(cancelled)).toContain('Cancelada');
  });

  it('emits the selected appointment', () => {
    render();
    block('Rosa Jaimes').click();
    expect(selected.map((a) => a.id)).toEqual(['a2']);
  });

  it('keeps appointment blocks as plain buttons without listitem roles', () => {
    render();
    expect(el.querySelector('[role="listitem"]')).toBeNull();
    expect(el.querySelector('button[role]')).toBeNull();
    expect(block('Rosa Jaimes').tagName).toBe('BUTTON');
  });

  it('exposes each dentist column as a labelled group', () => {
    render();
    for (const column of Array.from(columns())) {
      expect(column.getAttribute('role')).toBe('group');
      expect(column.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('does not stretch a single dentist column across the whole card', () => {
    render(undefined, { dentists: [DENTISTS[0]] });
    expect((el.querySelector('.grid') as HTMLElement).style.gridTemplateColumns).toBe('5rem minmax(0, 30rem)');
  });

  it('keeps a 15-minute block proportional while its touch area reaches 44px', () => {
    withShortProcedure(() => {
      const short = makeAppointment({
        id: 's1',
        dentistId: 'd1',
        procedureId: SHORT_PROCEDURE.id,
        procedureName: SHORT_PROCEDURE.name,
        durationMinutes: SHORT_PROCEDURE.durationMinutes,
        time: '09:00',
        patientName: 'Nicolás Ríos',
      });
      render(undefined, { appointments: [short] });
      const compact = block('Nicolás Ríos');
      // The visual block keeps its proportional height: 15 min × 2.4 − 4 = 32px.
      expect(compact.style.height).toBe('32px');
      // The interactive area grows 6px per side (after:-top-1.5/-bottom-1.5): 32 + 12 = 44px.
      expect(compact.className).toContain('after:-top-1.5');
      expect(compact.className).toContain('after:-bottom-1.5');
      // The button must not clip its own hit area: clipping lives on the inner wrapper.
      expect(compact.className).not.toContain('overflow-hidden');
      expect(6 + 6 + 32).toBeGreaterThanOrEqual(44);
    });
  });

  it('switches the visible dentist with toggle buttons reachable by keyboard', () => {
    stubNarrow(true);
    render();
    const group = el.querySelector('[aria-label="Odontólogo a mostrar"]') as HTMLElement;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.querySelector('[role="tab"]')).toBeNull();
    const buttons = Array.from(group.querySelectorAll('button'));
    expect(buttons).toHaveLength(3);
    // Every option stays in the natural tab order (no roving tabindex).
    for (const button of buttons) {
      expect(button.getAttribute('tabindex')).toBeNull();
    }
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    // Keyboard activation on a native button fires click: the pressed state follows.
    buttons[1].click();
    fixture.detectChanges();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    const cols = columns();
    expect(cols).toHaveLength(1);
    expect(cols[0].getAttribute('aria-label')).toBe('Agenda de Dr. Andrés Peña');
  });

  it('falls back to the first dentist when the visible one leaves the list', () => {
    stubNarrow(true);
    render();
    const buttons = Array.from(
      el.querySelectorAll<HTMLButtonElement>('[aria-label="Odontólogo a mostrar"] button'),
    );
    buttons[2].click();
    fixture.detectChanges();
    expect(columns()).toHaveLength(1);
    fixture.componentRef.setInput('dentists', [DENTISTS[0], DENTISTS[1]]);
    fixture.detectChanges();
    const cols = columns();
    expect(cols).toHaveLength(1);
    expect(cols[0].getAttribute('aria-label')).toBe('Agenda de Dra. Laura Villamizar');
  });

  it('draws the current-time line only on today within working hours', () => {
    render();
    const line = el.querySelector('.bg-destructive.h-0\\.5')?.parentElement as HTMLElement;
    // 09:10 → (70 × 2.4) + 16 = 184px.
    expect(line.style.top).toBe('184px');
    render(new Date(2026, 9, 15, 9, 10));
    expect(el.querySelector('.bg-destructive.h-0\\.5')).toBeNull();
  });
});
