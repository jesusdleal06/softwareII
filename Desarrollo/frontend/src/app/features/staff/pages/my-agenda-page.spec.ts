import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { getByText, text } from '../../../shared/testing/dom';
import { DENTIST_SESSION, memoryStorage } from '../../../shared/testing/session';
import { MyAgendaPage } from './my-agenda-page';

// Wednesday 2026-10-14: d1 has Gloria (08:30) and Rosa (14:00); d2 and d3 have one each.
const NOW = new Date(2026, 9, 14, 9, 10);

describe('MyAgendaPage', () => {
  let fixture: ComponentFixture<MyAgendaPage>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: memoryStorage(DENTIST_SESSION) },
      ],
    });
    fixture = TestBed.createComponent(MyAgendaPage);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  function patientList(): string[] {
    return Array.from(el.querySelectorAll('aside li')).map((li) => text(li));
  }

  it('shows only the logged-in dentist appointments, sorted by time', () => {
    expect(text(el)).toContain('Vista de solo lectura. Para cambios, comunícate con la auxiliar administrativa.');
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

  it('shows the empty state on a day without appointments', () => {
    (el.querySelector('[aria-label="Día anterior"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('[aria-label="Día anterior"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    // Monday 12: d1 has María Fernanda (Atendida) and Jorge (No asistió).
    expect(patientList()).toHaveLength(2);
    expect(text(el.querySelector('#lista-pacientes') as HTMLElement)).toBe('Pacientes del día (0 por atender)');
    (el.querySelector('[aria-label="Día anterior"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(text(el)).toContain('No tienes citas este día.');
  });

  it('opens the detail read-only', () => {
    getByText(el, 'aside button', 'Rosa Elvira Jaimes').click();
    fixture.detectChanges();
    expect(text(el)).toContain('Cita VD-1049');
    expect(el.querySelector('[aria-label="Acciones"]')).toBeNull();
  });
});
