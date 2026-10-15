import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DENTISTS } from '../../../core/data/mock-data';
import { Appointment } from '../../../core/models';
import { makeAppointment } from '../../../core/testing/appointment.fixture';
import { text } from '../../../shared/testing/dom';
import { DayAgenda } from './day-agenda';

const DAY = '2026-10-14';

const APPOINTMENTS: Appointment[] = [
  // 08:30 Limpieza (30 min) → top (30 × 2.4) + 16 + 2 = 90px, height 72 − 4 = 68px.
  makeAppointment({ id: 'a1', dentistId: 'd1', procedureId: 'p1', time: '08:30', patientName: 'Gloria Mantilla' }),
  // 14:00 Exodoncia (60 min) → top (360 × 2.4) + 18 = 882px, height 144 − 4 = 140px.
  makeAppointment({
    id: 'a2',
    dentistId: 'd1',
    procedureId: 'p4',
    time: '14:00',
    patientName: 'Rosa Jaimes',
    patientPhone: '3135556677',
  }),
  makeAppointment({
    id: 'a3',
    dentistId: 'd3',
    procedureId: 'p3',
    time: '10:00',
    patientName: 'Luz Pérez',
    status: 'Cancelada',
  }),
];

describe('DayAgenda', () => {
  let fixture: ComponentFixture<DayAgenda>;
  let el: HTMLElement;
  let selected: Appointment[];

  function render(now = new Date(2026, 9, 14, 9, 10)): void {
    fixture = TestBed.createComponent(DayAgenda);
    fixture.componentRef.setInput('dentists', DENTISTS);
    fixture.componentRef.setInput('appointments', APPOINTMENTS);
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

  it('renders one column per dentist with the hour axis', () => {
    render();
    const columns = Array.from(el.querySelectorAll('[role="list"]'));
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Agenda de Dra. Laura Villamizar',
      'Agenda de Dr. Andrés Peña',
      'Agenda de Dra. Camila Ortiz',
    ]);
    expect((el.querySelector('.grid') as HTMLElement).style.gridTemplateColumns).toBe(
      '5rem repeat(3, minmax(0, 1fr))',
    );
    expect((columns[0] as HTMLElement).style.height).toBe('1472px');
    expect(text(el)).toContain('8:00 AM');
    expect(text(el)).toContain('6:00 PM');
    expect(text(columns[0])).toContain('Descanso');
  });

  it('positions and sizes each block by start time and duration', () => {
    render();
    const morning = block('Gloria Mantilla');
    expect(morning.style.top).toBe('90px');
    expect(morning.style.height).toBe('68px');
    const afternoon = block('Rosa Jaimes');
    expect(afternoon.style.top).toBe('882px');
    expect(afternoon.style.height).toBe('140px');
    expect(text(afternoon)).toContain('Exodoncia · 2:00 PM–3:00 PM');
    // Blocks of 100px or more also show the phone.
    expect(text(afternoon)).toContain('313 555 6677');
    expect(text(morning)).not.toContain('300 000 0000');
    expect(afternoon.getAttribute('aria-label')).toBe('Rosa Jaimes, Exodoncia, 2:00 PM, Pendiente');
  });

  it('places each appointment in its dentist column', () => {
    render();
    const columns = el.querySelectorAll('[role="list"]');
    expect(columns[0].querySelectorAll('[role="listitem"]')).toHaveLength(2);
    expect(columns[1].querySelectorAll('[role="listitem"]')).toHaveLength(0);
    expect(columns[2].querySelectorAll('[role="listitem"]')).toHaveLength(1);
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

  it('draws the current-time line only on today within working hours', () => {
    render();
    const line = el.querySelector('.bg-destructive.h-0\\.5')?.parentElement as HTMLElement;
    // 09:10 → (70 × 2.4) + 16 = 184px.
    expect(line.style.top).toBe('184px');
    render(new Date(2026, 9, 15, 9, 10));
    expect(el.querySelector('.bg-destructive.h-0\\.5')).toBeNull();
  });
});
