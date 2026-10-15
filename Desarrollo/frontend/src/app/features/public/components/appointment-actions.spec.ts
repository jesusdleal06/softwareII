import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStore } from '../../../core/services/app-store.service';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { clickButton, getByText, text } from '../../../shared/testing/dom';
import { AppointmentActions } from './appointment-actions';

// Wednesday 2026-10-14 09:10. VD-1049: Rosa Elvira Jaimes, d1, Exodoncia, today 14:00, Pendiente.
const NOW = new Date(2026, 9, 14, 9, 10);

describe('AppointmentActions', () => {
  let fixture: ComponentFixture<AppointmentActions>;
  let el: HTMLElement;
  let store: AppStore;

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: null },
      ],
    });
    store = TestBed.inject(AppStore);
  });

  afterEach(() => vi.restoreAllMocks());

  function render(code: string, initialAction?: string): void {
    fixture = TestBed.createComponent(AppointmentActions);
    fixture.componentRef.setInput('code', code);
    if (initialAction) fixture.componentRef.setInput('initialAction', initialAction);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  function press(label: string): void {
    clickButton(el, label);
    fixture.detectChanges();
  }

  it('shows the not-found state for an unknown code', () => {
    render('VD-0000');
    expect(text(el)).toContain('No encontramos esta cita');
    expect(text(el)).toContain('El código VD-0000 no corresponde a ninguna cita.');
    expect(getByText(el, 'a', 'Agendar una cita nueva').getAttribute('href')).toBe('/agendar');
  });

  it('greets the patient and shows the summary and reminder preview', () => {
    render('vd-1049');
    expect(text(el)).toContain('Hola, Rosa');
    expect(text(el)).toContain('Estos son los detalles de tu cita. ¿Qué deseas hacer?');
    expect(text(el)).toContain('Así se ve el recordatorio que recibes');
    expect(el.querySelector('figure[aria-label="Vista previa del mensaje de WhatsApp"]')).not.toBeNull();
  });

  it('confirms attendance', () => {
    render('VD-1049');
    press('Confirmar asistencia');
    expect(store.appointmentByCode('VD-1049')?.status).toBe('Confirmada');
    expect(text(el)).toContain('¡Gracias por confirmar!');
    expect(text(el)).toContain('Te esperamos el 14/10/2026 a las 2:00 PM.');
  });

  it('cancels only after confirming the dialog and reports the released slot', () => {
    render('VD-1049');
    press('Cancelar cita');
    expect(text(el)).toContain('¿Seguro que deseas cancelar?');
    expect(store.appointmentByCode('VD-1049')?.status).toBe('Pendiente');

    press('No, conservar mi cita');
    expect(text(el)).not.toContain('¿Seguro que deseas cancelar?');
    expect(store.appointmentByCode('VD-1049')?.status).toBe('Pendiente');

    press('Cancelar cita');
    press('Sí, cancelar mi cita');
    expect(store.appointmentByCode('VD-1049')?.status).toBe('Cancelada');
    expect(text(el)).toContain('Tu cita fue cancelada');
    expect(text(el)).toContain('El horario del 14/10/2026 a las 2:00 PM quedó liberado para otro paciente.');
  });

  it('reschedules the appointment with the same dentist', () => {
    render('VD-1049');
    press('Reprogramar');
    expect(text(el)).toContain('Elige tu nuevo horario');
    expect(getByText<HTMLButtonElement>(el, 'button', 'Confirmar nuevo horario').disabled).toBe(true);

    getByText<HTMLButtonElement>(el, '[aria-label="Día"] button', '15').click();
    fixture.detectChanges();
    getByText<HTMLButtonElement>(el, '[aria-label="Horarios de la mañana"] button', '10:00 AM').click();
    fixture.detectChanges();
    press('Confirmar nuevo horario');

    expect(store.appointmentByCode('VD-1049')).toMatchObject({
      dentistId: 'd1',
      date: '2026-10-15',
      time: '10:00',
      status: 'Reprogramada',
    });
    expect(text(el)).toContain('¡Tu cita fue reprogramada!');
    expect(text(el)).toContain('Te enviaremos un nuevo recordatorio por WhatsApp el día anterior (14/10/2026) a las 6:00 PM.');
  });

  it('opens directly in reschedule mode with ?accion=reprogramar', () => {
    render('VD-1049', 'reprogramar');
    expect(text(el)).toContain('Reprogramar cita VD-1049');
  });

  it('does not offer changes for an appointment that is no longer active', () => {
    render('VD-1045'); // Luz Marina Pérez, Cancelada
    expect(text(el)).toContain('Esta cita ya no admite cambios (estado: Cancelada).');
    expect(el.querySelector('button')).toBeNull();
  });
});
