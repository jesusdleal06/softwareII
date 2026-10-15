import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStore } from '../../../core/services/app-store.service';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { clickButton, getByText, text } from '../../../shared/testing/dom';
import { AppointmentDetail } from './appointment-detail';

// Wednesday 2026-10-14 09:10. c9 = VD-1049, Rosa Elvira Jaimes, Wed 14:00, Exodoncia, Pendiente (d1).
const NOW = new Date(2026, 9, 14, 9, 10);
const ID = 'c9';

describe('AppointmentDetail', () => {
  let fixture: ComponentFixture<AppointmentDetail>;
  let el: HTMLElement;
  let store: AppStore;
  let closed: number;

  function render(id: string | null = ID, readOnly = false): void {
    fixture = TestBed.createComponent(AppointmentDetail);
    fixture.componentRef.setInput('appointmentId', id);
    fixture.componentRef.setInput('readOnly', readOnly);
    closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: null },
      ],
    });
    store = TestBed.inject(AppStore);
  });

  function click(label: string): void {
    clickButton(el, label);
    fixture.detectChanges();
  }

  function status(): string | undefined {
    return store.appointments().find((a) => a.id === ID)?.status;
  }

  function message(): string {
    const p = el.querySelector('p[role="status"]');
    return p ? text(p) : '';
  }

  it('renders nothing without an appointment', () => {
    render(null);
    expect(el.querySelector('dialog')).toBeNull();
  });

  it('shows the detail, origin and reminder', () => {
    render();
    expect(text(el)).toContain('Cita VD-1049');
    expect(text(el)).toContain('Origen: agendada por el paciente en la web');
    expect(text(el)).toContain('Rosa Elvira Jaimes');
    expect(text(el)).toContain('Recordatorio por WhatsApp');
    expect(text(el)).toContain('se enviará el mismo día (14/10/2026) a las 8:00 AM');
  });

  it('confirms the appointment', () => {
    render();
    click('Confirmar');
    expect(status()).toBe('Confirmada');
    expect(message()).toBe('Asistencia confirmada.');
    expect(getByText<HTMLButtonElement>(el, 'button', 'Asistencia ya confirmada').disabled).toBe(true);
  });

  it('marks the appointment as attended', () => {
    render();
    click('Marcar como atendida');
    expect(status()).toBe('Atendida');
    expect(message()).toBe('La cita se marcó como atendida.');
    expect(text(el)).toContain('Esta cita está en estado Atendida y no admite más acciones.');
    expect(el.querySelector('[aria-label="Acciones"]')).toBeNull();
  });

  it('marks the appointment as no-show', () => {
    render();
    click('Marcar como no asistió');
    expect(status()).toBe('No asistió');
    expect(message()).toBe('La cita se marcó como inasistencia.');
  });

  it('cancels after confirmation', () => {
    render();
    click('Cancelar cita');
    expect(text(el)).toContain('¿Cancelar esta cita?');
    expect(text(el)).toContain('Se liberará el horario del 14/10/2026 a las 2:00 PM para Rosa Elvira Jaimes.');
    click('No, volver');
    expect(status()).toBe('Pendiente');
    click('Cancelar cita');
    click('Sí, cancelar la cita');
    expect(status()).toBe('Cancelada');
    expect(message()).toBe('La cita fue cancelada y el horario quedó liberado.');
  });

  it('reschedules to a free slot', () => {
    render();
    click('Reprogramar');
    expect(text(el)).toContain('Reprogramar cita VD-1049');
    expect(text(el)).toContain('Rosa Elvira Jaimes · actualmente 14/10/2026 2:00 PM');
    expect(getByText<HTMLButtonElement>(el, 'button', 'Confirmar nuevo horario').disabled).toBe(true);
    getByText(el, '[aria-label="Día"] button', '15').click();
    fixture.detectChanges();
    getByText(el, '[aria-label="Horarios de la mañana"] button', '10:00 AM').click();
    fixture.detectChanges();
    click('Confirmar nuevo horario');
    const updated = store.appointments().find((a) => a.id === ID);
    expect(updated).toMatchObject({ status: 'Reprogramada', date: '2026-10-15', time: '10:00' });
    expect(message()).toBe('Cita reprogramada para el 15/10/2026 a las 10:00 AM.');
  });

  it('shows the conflict message when the slot was just taken', () => {
    render();
    vi.spyOn(store, 'rescheduleAppointment').mockReturnValue({ ok: false, reason: 'conflicto' });
    click('Reprogramar');
    getByText(el, '[aria-label="Día"] button', '15').click();
    fixture.detectChanges();
    getByText(el, '[aria-label="Horarios de la mañana"] button', '10:00 AM').click();
    fixture.detectChanges();
    click('Confirmar nuevo horario');
    expect(text(el.querySelector('[role="alert"]') as HTMLElement)).toBe('Este horario acaba de ser ocupado, elige otro.');
    expect(getByText<HTMLButtonElement>(el, 'button', 'Confirmar nuevo horario').disabled).toBe(true);
    click('Volver al detalle');
    expect(text(el)).toContain('Cita VD-1049');
  });

  it('hides the actions in read-only mode', () => {
    render(ID, true);
    expect(el.querySelector('[aria-label="Acciones"]')).toBeNull();
    expect(text(el)).not.toContain('no admite más acciones');
  });

  it('emits close from the modal', () => {
    render();
    (el.querySelector('[aria-label="Cerrar"]') as HTMLButtonElement).click();
    expect(closed).toBe(1);
  });
});
