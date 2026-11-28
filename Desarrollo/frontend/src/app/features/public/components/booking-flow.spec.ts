import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError } from '../../../core/api/api-error';
import { ClinicApi } from '../../../core/api/clinic-api';
import { makeAppointment } from '../../../core/testing/appointment.fixture';
import { createFakeStore, DENTISTS, FakeStore, PROCEDURES, provideFakeStore } from '../../../shared/testing/fake-store';
import { clickButton, getByText, settle, text, typeInto } from '../../../shared/testing/dom';
import { BookingFlow } from './booking-flow';

// Wednesday 2026-10-14 09:10; Thursday 15 at 10:00 is free for Dra. Villamizar (d1).
const NOW = new Date(2026, 9, 14, 9, 10);

type FakeApi = {
  requestPhoneCode: ReturnType<typeof vi.fn>;
  verifyPhoneCode: ReturnType<typeof vi.fn>;
};

describe('BookingFlow', () => {
  let fixture: ComponentFixture<BookingFlow>;
  let el: HTMLElement;
  let store: FakeStore;
  let api: FakeApi;

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    store = createFakeStore({ now: NOW });
    // The store converts the ids to numbers for the API, so the catalogs keep the numeric suffix.
    store.dentistsState.set(DENTISTS.map((dentist) => ({ ...dentist, id: dentist.id.slice(1) })));
    store.proceduresState.set(PROCEDURES.map((procedure) => ({ ...procedure, id: procedure.id.slice(1) })));
    api = {
      requestPhoneCode: vi.fn(async () => undefined),
      verifyPhoneCode: vi.fn(async () => ({ verificationToken: 'vt-1' })),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideFakeStore(store), { provide: ClinicApi, useValue: api }],
    });
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

  it('CP-RNF02-02: keeps incomplete selection feedback next to the focused action', () => {
    create();
    const button = getByText<HTMLButtonElement>(el, 'button', 'Continuar');
    button.focus();
    button.click();
    fixture.detectChanges();
    const alerts = el.querySelectorAll('[role="alert"]');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].textContent?.trim()).toBe(
      'Selecciona el odontólogo, el procedimiento, el día y la hora para continuar.',
    );
    expect(button.previousElementSibling).toBe(alerts[0]);
    expect(document.activeElement).toBe(button);
    expect(text(el.querySelector('h1')!)).toBe('Elige tu horario');
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

  /** Requests the WhatsApp code, which reveals the code field, and types `code`. */
  async function sendCode(code = '123456'): Promise<void> {
    clickButton(el, 'Enviar código por WhatsApp');
    await refresh();
    typeInto(el.querySelector('#booking-code') as HTMLInputElement, code);
    fixture.detectChanges();
  }

  it('books an appointment through the three steps', async () => {
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    expect(el.querySelector('h1')?.textContent).toContain('Tus datos');
    expect(text(el)).toContain(
      '10 dígitos. A este número enviaremos un código de verificación y el recordatorio por WhatsApp.',
    );

    await fillPatient('Ana Pérez', '300 999 8877');
    expect(el.querySelector('h1')?.textContent).toContain('Confirma tu cita');
    expect(text(el)).toContain('Revisa que todo esté correcto antes de confirmar.');
    expect(text(el)).toContain('el día anterior (14/10/2026) a las 6:00 PM');
    expect(getByText<HTMLButtonElement>(el, 'button', 'Enviar código por WhatsApp')).toBeTruthy();

    await sendCode();
    const confirmButton = getByText<HTMLButtonElement>(el, 'button', 'Confirmar cita');
    expect(confirmButton.className).toContain('flex-1');
    expect(confirmButton.className).toContain('min-h-16');
    confirmButton.click();
    await refresh();

    expect(api.verifyPhoneCode).toHaveBeenCalledWith('3009998877', '123456');
    // The store owns the public booking and the conflict mapping; the flow only adds the token.
    expect(store.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        dentistId: '1',
        procedureId: '1',
        date: '2026-10-15',
        time: '10:00',
        patientPhone: '3009998877',
        patientName: 'Ana Pérez',
        origin: 'Web',
        verificationToken: 'vt-1',
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
    await sendCode();
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

    await sendCode();
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
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');
    await sendCode();
    clickButton(el, 'Confirmar cita');
    await refresh();

    const tint = el.querySelector('[class*="dark:bg-success/"]');
    expect(tint?.className).toContain('dark:bg-success/20');
    expect(el.innerHTML).not.toContain('dark:bg-success/25');
  });

  it('CP-RF02-10: asks for the WhatsApp code on step 3 and allows a resend after 60 seconds', async () => {
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');

    expect(el.querySelectorAll('ol[aria-label="Progreso"] li')).toHaveLength(3);
    expect(getByText<HTMLButtonElement>(el, 'button', 'Enviar código por WhatsApp').disabled).toBe(false);

    vi.useFakeTimers();
    getByText<HTMLButtonElement>(el, 'button', 'Enviar código por WhatsApp').click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(api.requestPhoneCode).toHaveBeenCalledWith('3009998877');
    const input = el.querySelector('#booking-code') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    expect(el.querySelector('label[for="booking-code"]')?.textContent?.trim()).toBe('Código de verificación');
    expect(el.querySelectorAll('ol[aria-label="Progreso"] li')).toHaveLength(3);
    expect(text(el)).toContain('Podrás reenviar el código en 60 s.');

    const resend = () => getByText<HTMLButtonElement>(el, 'button', 'Reenviar código');
    expect(resend().disabled).toBe(true);

    await vi.advanceTimersByTimeAsync(59_000);
    fixture.detectChanges();
    expect(resend().disabled).toBe(true);
    expect(text(el)).toContain('Podrás reenviar el código en 1 s.');

    await vi.advanceTimersByTimeAsync(1_000);
    fixture.detectChanges();
    expect(resend().disabled).toBe(false);
    expect(text(el)).toContain('Ya puedes solicitar un nuevo código.');

    vi.useRealTimers();
  });

  it('shows the WhatsApp code error inline when the backend rejects it', async () => {
    api.verifyPhoneCode.mockRejectedValue(new ApiError(400, 'INVALID_CODE', 'El código no es correcto.'));
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');
    await sendCode('000000');
    clickButton(el, 'Confirmar cita');
    await refresh();

    expect(el.querySelector('#booking-code-error')?.textContent).toContain('El código no es correcto.');
    expect(store.createAppointment).not.toHaveBeenCalled();
    expect(el.querySelector('h1')?.textContent).toContain('Confirma tu cita');
  });

  it('shows the phone-not-verified error inline and keeps the code step', async () => {
    store.createAppointment.mockRejectedValue(
      new ApiError(400, 'PHONE_NOT_VERIFIED', 'Verifica tu número de celular para confirmar la cita.'),
    );
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');
    await sendCode();
    clickButton(el, 'Confirmar cita');
    await refresh();

    expect(text(el)).toContain('Verifica tu número de celular para confirmar la cita.');
    expect(el.querySelector('#booking-code')).toBeTruthy();
    expect(el.querySelector('h1')?.textContent).toContain('Confirma tu cita');
  });

  it('shows the request-code error inline when the phone asked for too many codes', async () => {
    api.requestPhoneCode.mockRejectedValue(
      new ApiError(429, 'TOO_MANY_CODE_REQUESTS', 'Has solicitado demasiados códigos. Intenta de nuevo más tarde.'),
    );
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');
    clickButton(el, 'Enviar código por WhatsApp');
    await refresh();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Has solicitado demasiados códigos. Intenta de nuevo más tarde.',
    );
    expect(el.querySelector('#booking-code')).toBeNull();
  });

  it('shows the send failure inline when WhatsApp cannot deliver the code', async () => {
    api.requestPhoneCode.mockRejectedValue(new ApiError(503, null, 'Service Unavailable'));
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');
    clickButton(el, 'Enviar código por WhatsApp');
    await refresh();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos enviar el código. Intenta de nuevo en unos minutos.',
    );
    expect(el.querySelector('#booking-code')).toBeNull();
  });

  it('discards the code and token when the patient goes back to change the phone', async () => {
    create();
    await pickSlot();
    clickButton(el, 'Continuar');
    await refresh();
    await fillPatient('Ana Pérez', '300 999 8877');
    await sendCode();
    expect(el.querySelector('#booking-code')).toBeTruthy();

    clickButton(el, 'Atrás');
    await refresh();
    expect(el.querySelector('h1')?.textContent).toContain('Tus datos');

    clickButton(el, 'Continuar');
    await refresh();
    expect(el.querySelector('#booking-code')).toBeNull();
    expect(getByText<HTMLButtonElement>(el, 'button', 'Enviar código por WhatsApp')).toBeTruthy();
  });
});
