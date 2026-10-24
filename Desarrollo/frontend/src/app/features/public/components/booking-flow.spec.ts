import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { makeAppointment } from '../../../core/testing/appointment.fixture';
import { createFakeStore, FakeStore, provideFakeStore } from '../../../shared/testing/fake-store';
import { clickButton, getByText, settle, text, typeInto } from '../../../shared/testing/dom';
import { BookingFlow } from './booking-flow';

// Wednesday 2026-10-14 09:10; Thursday 15 at 10:00 is free for Dra. Villamizar (d1).
const NOW = new Date(2026, 9, 14, 9, 10);

describe('BookingFlow', () => {
  let fixture: ComponentFixture<BookingFlow>;
  let el: HTMLElement;
  let store: FakeStore;

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    store = createFakeStore({ now: NOW });
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideFakeStore(store)] });
  });

  afterEach(() => vi.restoreAllMocks());

  function create(): void {
    fixture = TestBed.createComponent(BookingFlow);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  /** Renders, lets the fake store's promises resolve, and renders the result. */
  async function refresh(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
  }

  async function click(selector: string, label: string): Promise<void> {
    getByText<HTMLButtonElement>(el, selector, label).click();
    await refresh();
  }

  async function pickSlot(): Promise<void> {
    await click('[aria-label="Odontólogo"] button', 'Dra. Laura Villamizar');
    await click('[aria-label="Procedimiento"] button', 'Limpieza');
    await click('[aria-label="Día"] button', '15');
    await click('[aria-label="Horarios de la mañana"] button', '10:00 AM');
  }

  async function fillPatient(name: string, phone: string): Promise<void> {
    typeInto(el.querySelector('#pac-nombre') as HTMLInputElement, name);
    fixture.detectChanges();
    typeInto(el.querySelector('#pac-telefono') as HTMLInputElement, phone);
    fixture.detectChanges();
    clickButton(el, 'Continuar');
    await refresh();
  }

  it('starts on step 1 with the continue button focusable and explained', () => {
    create();
    expect(el.querySelector('h1')?.textContent).toContain('Elige tu horario');
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
    create();
    getByText<HTMLButtonElement>(el, 'button', 'Continuar').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Selecciona el odontólogo, el procedimiento, el día y la hora para continuar.',
    );
  });

  it('moves focus to the step heading on step change', async () => {
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await refresh();
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toContain('Tus datos');
  });

  it('hides decorative icons from assistive technology and avoids hard-coded colors', () => {
    create();
    const svgs = Array.from(el.querySelectorAll('svg'));
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden') === 'true' || svg.closest('[aria-hidden="true"]') !== null).toBe(true);
    }
    expect(el.innerHTML).not.toContain('oklch');
  });

  it('books an appointment through the three steps', async () => {
    store.createAppointment.mockResolvedValue({
      ok: true,
      appointment: makeAppointment({
        id: 'a9',
        code: 'VD-3000',
        date: '2026-10-15',
        time: '10:00',
        patientName: 'Ana Pérez',
        patientPhone: '3009998877',
      }),
    });
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    expect(el.querySelector('h1')?.textContent).toContain('Tus datos');

    await fillPatient('Ana Pérez', '300 999 8877');
    expect(el.querySelector('h1')?.textContent).toContain('Confirma tu cita');
    expect(text(el)).toContain('Revisa que todo esté correcto antes de confirmar.');
    expect(text(el)).toContain('el día anterior (14/10/2026) a las 6:00 PM');

    const confirmButton = getByText<HTMLButtonElement>(el, 'button', 'Confirmar cita');
    expect(confirmButton.className).toContain('flex-1');
    expect(confirmButton.className).toContain('min-h-16');
    confirmButton.click();
    await refresh();

    expect(store.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        dentistId: 'd1',
        procedureId: 'p1',
        date: '2026-10-15',
        time: '10:00',
        origin: 'Web',
        patientPhone: '3009998877',
        patientName: 'Ana Pérez',
      }),
    );
    expect(text(el)).toContain('¡Tu cita quedó agendada!');
    expect(text(el)).toContain('Guarda este código: VD-3000');
  });

  it('keeps the patient on step 2 while the data is invalid', async () => {
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana', '123');
    expect(el.querySelector('h1')?.textContent).toContain('Tus datos');
    expect(text(el)).toContain('Escribe nombre y apellido.');
    expect(text(el)).toContain('El celular debe tener 10 dígitos.');
  });

  it('blocks a phone that already has an active appointment', async () => {
    store.createAppointment.mockResolvedValue({ ok: false, reason: 'cita-activa' });
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Rosa Elvira Jaimes', '313 555 6677');
    clickButton(el, 'Confirmar cita');
    await refresh();

    expect(text(el)).toContain('Ya tienes una cita programada');
    expect(text(el)).toContain('Con el celular 313 555 6677 ya existe una cita activa.');
    expect(text(el)).toContain('Usa el enlace personal de tu recordatorio para reprogramarla o cancelarla.');
  });

  it('returns to step 1 with the conflict message when the slot was just taken', async () => {
    store.createAppointment.mockResolvedValue({ ok: false, reason: 'conflicto' });
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');

    clickButton(el, 'Confirmar cita');
    await refresh();

    expect(el.querySelector('h1')?.textContent).toContain('Elige tu horario');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Este horario acaba de ser ocupado. Por favor elige otro.',
    );
  });

  it('announces its step changes in a live region of its own', async () => {
    create();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Elige tu horario');

    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Tus datos');
  });

  it('hooks the continue hint through aria-describedby only while the hint applies', async () => {
    create();
    const button = () => getByText<HTMLButtonElement>(el, 'button', 'Continuar');
    expect(button().getAttribute('aria-describedby')).toBe('booking-continue-hint');

    await pickSlot();
    expect(button().getAttribute('aria-describedby')).toBeNull();
    expect(el.querySelector('#booking-continue-hint')).toBeNull();
  });

  it('moves focus back to the heading when returning to a previous step', async () => {
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await refresh();

    clickButton(el, 'Atrás');
    await refresh();
    await refresh();
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toContain('Elige tu horario');
  });

  it('focuses the first invalid field when the patient data is rejected', async () => {
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();

    await fillPatient('Ana', '300 999 8877');
    await refresh();
    expect(document.activeElement?.id).toBe('pac-nombre');

    await fillPatient('Ana Pérez', '123');
    await refresh();
    expect(document.activeElement?.id).toBe('pac-telefono');
  });

  it('gives the inline help link the full-opacity focus ring', async () => {
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');
    const link = getByText(el, 'a', 'vuelve al inicio');
    expect(link.className).toContain('focus-visible:ring-2');
    expect(link.className).toContain('focus-visible:ring-ring');
  });

  it('keeps the dark success tint at the S2 ceiling after booking', async () => {
    store.createAppointment.mockResolvedValue({
      ok: true,
      appointment: makeAppointment({ id: 'a9', code: 'VD-3000', date: '2026-10-15', time: '10:00' }),
    });
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');
    clickButton(el, 'Confirmar cita');
    await refresh();

    const tint = el.querySelector('[class*="dark:bg-success/"]');
    expect(tint?.className).toContain('dark:bg-success/20');
    expect(el.innerHTML).not.toContain('dark:bg-success/25');
  });
});
