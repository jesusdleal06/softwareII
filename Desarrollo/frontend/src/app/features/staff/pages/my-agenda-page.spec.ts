import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { makeAppointment } from '../../../core/testing/appointment.fixture';
import { CLOCK } from '../../../core/services/tokens';
import { getByText, settle, text } from '../../../shared/testing/dom';
import { createFakeStore, FakeStore, provideFakeStore } from '../../../shared/testing/fake-store';
import { DENTIST_SESSION } from '../../../shared/testing/session';
import { MyAgendaPage } from './my-agenda-page';

// Wednesday 2026-10-14: d1 has Gloria (08:30) and Rosa (14:00); d2 and d3 have one each.
const NOW = new Date(2026, 9, 14, 9, 10);

const APPOINTMENTS = [
  makeAppointment({ id: 'c1', code: 'VD-1046', patientName: 'Gloria Inés Mantilla', dentistId: 'd1', date: '2026-10-14', time: '08:30' }),
  makeAppointment({ id: 'c9', code: 'VD-1049', patientName: 'Rosa Elvira Jaimes', dentistId: 'd1', date: '2026-10-14', time: '14:00', procedureId: 'p4', procedureName: 'Exodoncia', durationMinutes: 60 }),
  makeAppointment({ id: 'c2', code: 'VD-1047', patientName: 'Sebastián Gómez', dentistId: 'd2', date: '2026-10-14', time: '10:00' }),
  makeAppointment({ id: 'c3', code: 'VD-1048', patientName: 'Hernando Ariza', dentistId: 'd3', date: '2026-10-14', time: '11:00' }),
  makeAppointment({ id: 'c4', code: 'VD-1041', patientName: 'María Fernanda Ruiz', dentistId: 'd1', date: '2026-10-12', time: '09:00', status: 'Atendida' }),
  makeAppointment({ id: 'c5', code: 'VD-1042', patientName: 'Jorge Salazar', dentistId: 'd1', date: '2026-10-12', time: '10:00', status: 'No asistió' }),
];

describe('MyAgendaPage', () => {
  let fixture: ComponentFixture<MyAgendaPage>;
  let el: HTMLElement;
  let store: FakeStore;

  beforeEach(async () => {
    store = createFakeStore({ now: NOW, session: DENTIST_SESSION, appointments: APPOINTMENTS.map((a) => ({ ...a })) });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CLOCK, useValue: () => new Date(NOW) }, provideFakeStore(store)],
    });
    fixture = TestBed.createComponent(MyAgendaPage);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  async function refresh(): Promise<void> {
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
  }

  function patientList(): string[] {
    return Array.from(el.querySelectorAll('aside li')).map((li) => text(li));
  }

  it('shows only the logged-in dentist appointments, sorted by time', () => {
    expect(text(el)).toContain('Vista de solo lectura. Para cambios, comunícate con la auxiliar administrativa.');
    expect(el.classList).toContain('gap-6');
    const columns = el.querySelectorAll('[aria-label^="Agenda de "]');
    expect(columns).toHaveLength(1);
    expect(columns[0].getAttribute('aria-label')).toBe('Agenda de Dra. Laura Villamizar');
    expect(columns[0].querySelectorAll('button')).toHaveLength(2);
    const list = patientList();
    expect(list).toHaveLength(2);
    expect(list[0]).toContain('8:30 AM · Gloria Inés Mantilla');
    expect(list[1]).toContain('2:00 PM · Rosa Elvira Jaimes');
    expect(text(el)).not.toContain('Sebastián Gómez');
    expect(text(el)).not.toContain('Hernando Ariza');
    expect(text(el.querySelector('#lista-pacientes') as HTMLElement)).toBe('Pacientes del día (2 por atender)');
  });

  it('shows the empty state on a day without appointments', async () => {
    (el.querySelector('[aria-label="Día anterior"]') as HTMLButtonElement).click();
    await refresh();
    (el.querySelector('[aria-label="Día anterior"]') as HTMLButtonElement).click();
    await refresh();
    // Monday 12: d1 has María Fernanda (Atendida) and Jorge (No asistió).
    expect(patientList()).toHaveLength(2);
    expect(text(el.querySelector('#lista-pacientes') as HTMLElement)).toBe('Pacientes del día (0 por atender)');
    (el.querySelector('[aria-label="Día anterior"]') as HTMLButtonElement).click();
    await refresh();
    expect(text(el)).toContain('No tienes citas este día.');
  });

  it('opens the detail read-only', async () => {
    getByText(el, 'aside button', 'Rosa Elvira Jaimes').click();
    await refresh();
    expect(text(el)).toContain('Cita VD-1049');
    expect(el.querySelector('[aria-label="Acciones"]')).toBeNull();
  });
});
