import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { makeAppointment } from '../../../core/testing/appointment.fixture';
import { createFakeStore, FakeStore, provideFakeStore } from '../../../shared/testing/fake-store';
import { clickButton, getByText, settle, text } from '../../../shared/testing/dom';
import { AppointmentActions } from './appointment-actions';

const active = makeAppointment({
  id: 'a1',
  code: 'VD-1049',
  patientName: 'Rosa Elvira Jaimes',
  patientPhone: '3001234567',
  dentistId: 'd1',
  dentistName: 'Dra. Laura Villamizar',
  procedureId: 'p2',
  procedureName: 'Exodoncia',
  date: '2026-10-14',
  time: '14:00',
  durationMinutes: 45,
  status: 'Pendiente',
});

// Wednesday 2026-10-14 09:10.
const NOW = new Date(2026, 9, 14, 9, 10);

describe('AppointmentActions', () => {
  let fixture: ComponentFixture<AppointmentActions>;
  let el: HTMLElement;
  let store: FakeStore;

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    store = createFakeStore({ now: NOW });
    store.managed.mockResolvedValue(active);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideFakeStore(store)],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  async function render(token: string, initialAction?: string): Promise<void> {
    fixture = TestBed.createComponent(AppointmentActions);
    fixture.componentRef.setInput('token', token);
    if (initialAction) fixture.componentRef.setInput('initialAction', initialAction);
    fixture.detectChanges();
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  async function press(label: string): Promise<void> {
    clickButton(el, label);
    fixture.detectChanges();
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
  }

  it('shows the not-found state for an unknown token', async () => {
    store.managed.mockResolvedValue(null);
    await render('missing-token');
    expect(text(el)).toContain('No encontramos esta cita');
    expect(text(el)).toContain('El enlace no corresponde a una cita activa.');
    expect(getByText(el, 'a', 'Agendar mi cita').getAttribute('href')).toBe('/agendar');
  });

  it('greets the patient and shows the summary and reminder preview', async () => {
    await render('token-1');
    expect(store.managed).toHaveBeenCalledWith('token-1');
    expect(text(el)).toContain('Hola, Rosa');
    expect(text(el)).toContain('Estos son los detalles de tu cita. ¿Qué deseas hacer?');
    expect(text(el)).toContain('Así se ve el recordatorio que recibes');
    expect(el.querySelector('figure[aria-label="Vista previa del mensaje de WhatsApp"]')).not.toBeNull();
  });

  it('confirms attendance', async () => {
    store.confirmManaged.mockResolvedValue({ ...active, status: 'Confirmada' });
    await render('token-1');
    await press('Confirmar asistencia');
    expect(store.confirmManaged).toHaveBeenCalledWith('token-1');
    expect(text(el)).toContain('¡Gracias por confirmar!');
    expect(text(el)).toContain('Te esperamos el 14/10/2026 a las 2:00 PM.');
  });

  it('cancels only after confirming the dialog and reports the released slot', async () => {
    store.cancelManaged.mockResolvedValue({ ...active, status: 'Cancelada' });
    await render('token-1');
    await press('Cancelar cita');
    expect(text(el)).toContain('¿Seguro que deseas cancelar?');
    expect(store.cancelManaged).not.toHaveBeenCalled();

    await press('No, conservar mi cita');
    expect(text(el)).not.toContain('¿Seguro que deseas cancelar?');
    expect(store.cancelManaged).not.toHaveBeenCalled();

    await press('Cancelar cita');
    await press('Sí, cancelar mi cita');
    expect(store.cancelManaged).toHaveBeenCalledWith('token-1');
    expect(text(el)).toContain('Tu cita fue cancelada');
    expect(text(el)).toContain('El horario del 14/10/2026 a las 2:00 PM quedó liberado para otro paciente.');
  });

  it('reschedules the appointment with the same dentist', async () => {
    store.rescheduleManaged.mockResolvedValue({
      ...active,
      date: '2026-10-15',
      time: '10:00',
      status: 'Reprogramada',
    });
    await render('token-1');
    await press('Reprogramar');
    expect(text(el)).toContain('Elige tu nuevo horario');
    expect(getByText<HTMLButtonElement>(el, 'button', 'Confirmar nuevo horario').disabled).toBe(true);

    getByText<HTMLButtonElement>(el, '[aria-label="Día"] button', '15').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
    getByText<HTMLButtonElement>(el, '[aria-label="Horarios de la mañana"] button', '10:00 AM').click();
    fixture.detectChanges();
    await press('Confirmar nuevo horario');

    expect(store.rescheduleManaged).toHaveBeenCalledWith('token-1', '2026-10-15', '10:00');
    expect(text(el)).toContain('¡Tu cita fue reprogramada!');
    expect(text(el)).toContain('Te enviaremos un nuevo recordatorio por WhatsApp el día anterior (14/10/2026) a las 6:00 PM.');
  });

  it('opens directly in reschedule mode with ?accion=reprogramar', async () => {
    await render('token-1', 'reprogramar');
    expect(text(el)).toContain('Elige tu nuevo horario');
    expect(text(el)).toContain('VD-1049');
  });

  it('announces view changes in a status region and moves focus to the heading', async () => {
    store.confirmManaged.mockResolvedValue({ ...active, status: 'Confirmada' });
    await render('token-1');
    await press('Confirmar asistencia');
    await settle();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('confirmada');
    expect(document.activeElement?.tagName).toBe('H1');
  });

  it('hides decorative icons from assistive technology', async () => {
    await render('token-1');
    const svgs = Array.from(el.querySelectorAll('svg'));
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden') === 'true' || svg.closest('[aria-hidden="true"]') !== null).toBe(true);
    }
  });

  it('announces reschedule conflicts in a live region', async () => {
    store.rescheduleManaged.mockRejectedValue(new Error('SLOT_TAKEN'));
    await render('token-1', 'reprogramar');
    getByText<HTMLButtonElement>(el, '[aria-label="Día"] button', '15').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
    getByText<HTMLButtonElement>(el, '[aria-label="Horarios de la mañana"] button', '10:00 AM').click();
    fixture.detectChanges();

    await press('Confirmar nuevo horario');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Este horario acaba de ser ocupado');
  });

  it('does not offer changes for an appointment that is no longer active', async () => {
    store.managed.mockResolvedValue(makeAppointment({ id: 'a2', code: 'VD-1045', status: 'Cancelada' }));
    await render('token-2');
    expect(text(el)).toContain('Esta cita ya no admite cambios (estado: Cancelada).');
    expect(el.querySelector('button')).toBeNull();
  });

  it('moves focus to the heading when entering and leaving reschedule', async () => {
    await render('token-1');

    await press('Reprogramar');
    await settle();
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toContain('Elige tu nuevo horario');

    await press('Volver');
    await settle();
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toContain('Hola, Rosa');
  });

  it('offers the unified booking label instead of "Agendar una cita nueva"', async () => {
    store.managed.mockResolvedValue(makeAppointment({ id: 'a2', code: 'VD-1045', status: 'Cancelada' }));
    await render('token-2');
    expect(getByText(el, 'a', 'Agendar mi cita').getAttribute('href')).toBe('/agendar');
    expect(text(el)).not.toContain('Agendar una cita nueva');
  });
});
