import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStore } from '../../../core/services/app-store.service';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { clickButton, getByText, text, typeInto } from '../../../shared/testing/dom';
import { BookingFlow } from './booking-flow';

// Wednesday 2026-10-14 09:10; Thursday 15 at 10:00 is free for Dra. Villamizar (d1).
const NOW = new Date(2026, 9, 14, 9, 10);

describe('BookingFlow', () => {
  let fixture: ComponentFixture<BookingFlow>;
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
    fixture = TestBed.createComponent(BookingFlow);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.restoreAllMocks());

  function click(selector: string, label: string): void {
    getByText<HTMLButtonElement>(el, selector, label).click();
    fixture.detectChanges();
  }

  function pickSlot(): void {
    click('[aria-label="Odontólogo"] button', 'Dra. Laura Villamizar');
    click('[aria-label="Procedimiento"] button', 'Limpieza');
    click('[aria-label="Día"] button', '15');
    click('[aria-label="Horarios de la mañana"] button', '10:00 AM');
  }

  function fillPatient(name: string, phone: string): void {
    typeInto(el.querySelector('#pac-nombre') as HTMLInputElement, name);
    fixture.detectChanges();
    typeInto(el.querySelector('#pac-telefono') as HTMLInputElement, phone);
    fixture.detectChanges();
    clickButton(el, 'Continuar');
    fixture.detectChanges();
  }

  it('starts on step 1 with the continue button focusable and explained', () => {
    expect(text(el)).toContain('Paso 1 de 3');
    expect(text(el)).toContain('Cada odontólogo tiene su propia agenda.');
    const button = getByText<HTMLButtonElement>(el, 'button', 'Continuar');
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    const describedBy = button.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(el.querySelector(`#${describedBy}`)?.textContent).toContain('odontólogo');
    expect(el.querySelector('li[aria-current="step"]')?.textContent).toContain('Elige tu horario');
  });

  it('announces the requirement in a live region when continuing with an incomplete selection', () => {
    getByText<HTMLButtonElement>(el, 'button', 'Continuar').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Selecciona el odontólogo, el procedimiento, el día y la hora para continuar.',
    );
  });

  it('moves focus to the step heading on step change', async () => {
    pickSlot();
    clickButton(el, 'Continuar');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toContain('Tus datos');
  });

  it('hides decorative icons from assistive technology and avoids hard-coded colors', () => {
    const svgs = Array.from(el.querySelectorAll('svg'));
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden') === 'true' || svg.closest('[aria-hidden="true"]') !== null).toBe(true);
    }
    expect(el.innerHTML).not.toContain('oklch');
  });

  it('books an appointment through the three steps', () => {
    pickSlot();
    clickButton(el, 'Continuar');
    fixture.detectChanges();
    expect(text(el)).toContain('Paso 2 de 3');

    fillPatient('Ana Pérez', '300 999 8877');
    expect(text(el)).toContain('Paso 3 de 3');
    expect(text(el)).toContain('Revisa que todo esté correcto antes de confirmar.');
    expect(text(el)).toContain('el día anterior (14/10/2026) a las 6:00 PM');

    const confirmButton = getByText<HTMLButtonElement>(el, 'button', 'Confirmar cita');
    expect(confirmButton.className).toContain('flex-1'); // template class kept
    expect(confirmButton.className).toContain('min-h-16'); // BigButton size xl
    confirmButton.click();
    fixture.detectChanges();

    const created = store.appointments().find((a) => a.patientPhone === '3009998877');
    expect(created).toMatchObject({ dentistId: 'd1', procedureId: 'p1', date: '2026-10-15', time: '10:00', origin: 'Web' });
    expect(created?.patientName).toBe('Ana Pérez');
    expect(text(el)).toContain('¡Tu cita quedó agendada!');
    expect(text(el)).toContain(`Guarda este código: ${created?.code}`);
    expect(getByText(el, 'a', 'Ver mi cita').getAttribute('href')).toBe(`/cita/${created?.code}`);
  });

  it('keeps the patient on step 2 while the data is invalid', () => {
    pickSlot();
    clickButton(el, 'Continuar');
    fixture.detectChanges();
    fillPatient('Ana', '123');
    expect(text(el)).toContain('Paso 2 de 3');
    expect(text(el)).toContain('Escribe nombre y apellido.');
    expect(text(el)).toContain('El celular debe tener 10 dígitos.');
  });

  it('blocks a phone that already has an active appointment', () => {
    pickSlot();
    clickButton(el, 'Continuar');
    fixture.detectChanges();
    fillPatient('Rosa Elvira Jaimes', '313 555 6677');

    expect(text(el)).toContain('Ya tienes una cita programada');
    expect(text(el)).toContain('Con el celular 313 555 6677 encontramos una cita activa.');
    expect(text(el)).toContain('VD-1049');
    expect(getByText(el, 'a', 'Reprogramar esa cita').getAttribute('href')).toBe('/cita/VD-1049?accion=reprogramar');
  });

  it('cancels the active appointment and continues with the new one', () => {
    pickSlot();
    clickButton(el, 'Continuar');
    fixture.detectChanges();
    fillPatient('Rosa Elvira Jaimes', '313 555 6677');

    clickButton(el, 'Cancelar esa cita y agendar la nueva');
    fixture.detectChanges();
    expect(text(el)).toContain('¿Cancelar tu cita actual?');
    clickButton(el, 'Sí, cancelar la cita actual');
    fixture.detectChanges();

    expect(store.appointmentByCode('VD-1049')?.status).toBe('Cancelada');
    expect(text(el)).toContain('Paso 3 de 3');
  });

  it('returns to step 1 with the conflict message when the slot was just taken', () => {
    pickSlot();
    clickButton(el, 'Continuar');
    fixture.detectChanges();
    fillPatient('Ana Pérez', '300 999 8877');

    const taken = store.createAppointment({
      dentistId: 'd1',
      procedureId: 'p1',
      date: '2026-10-15',
      time: '10:00',
      patientName: 'Otro Paciente',
      patientPhone: '3001110000',
      origin: 'Manual',
    });
    expect(taken.ok).toBe(true);

    clickButton(el, 'Confirmar cita');
    fixture.detectChanges();

    expect(text(el)).toContain('Paso 1 de 3');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Este horario acaba de ser ocupado. Por favor elige otro.',
    );
    expect(store.appointments().some((a) => a.patientPhone === '3009998877')).toBe(false);
  });
});
