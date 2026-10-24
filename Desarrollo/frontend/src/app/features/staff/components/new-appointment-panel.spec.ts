import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { makeAppointment } from '../../../core/testing/appointment.fixture';
import { createFakeStore, FakeStore, provideFakeStore } from '../../../shared/testing/fake-store';
import { clickButton, getByText, settle, text, typeInto } from '../../../shared/testing/dom';
import { NewAppointmentPanel } from './new-appointment-panel';

// Wednesday 2026-10-14 09:10; Thursday 15 at 10:00 is free for Dra. Villamizar (d1).
const NOW = new Date(2026, 9, 14, 9, 10);
const CONFLICT = 'Este horario acaba de ser ocupado, elige otro.';

describe('NewAppointmentPanel', () => {
  let fixture: ComponentFixture<NewAppointmentPanel>;
  let el: HTMLElement;
  let store: FakeStore;

  beforeEach(() => {
    store = createFakeStore({ now: NOW });
    store.createAppointment.mockResolvedValue({
      ok: true,
      appointment: makeAppointment({
        id: 'new',
        code: 'VD-4000',
        date: '2026-10-15',
        time: '10:00',
        patientName: 'Ana Pérez',
        patientPhone: '3009998877',
        origin: 'Manual',
      }),
    });
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideFakeStore(store)] });
    fixture = TestBed.createComponent(NewAppointmentPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('initialDate', '2026-10-14');
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.restoreAllMocks());

  function select(id: string, value: string): void {
    const s = el.querySelector(id) as HTMLSelectElement;
    s.value = value;
    s.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  async function pickSlot(): Promise<void> {
    select('#sp-dentista-select', 'd1');
    select('#sp-proc-select', 'p1');
    getByText(el, '[aria-label="Día"] button', '15').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
    getByText(el, '[aria-label="Horarios de la mañana"] button', '10:00 AM').click();
    fixture.detectChanges();
  }

  function fillPatient(name: string, phone: string): void {
    typeInto(el.querySelector('#nc-nombre') as HTMLInputElement, name);
    fixture.detectChanges();
    typeInto(el.querySelector('#nc-telefono') as HTMLInputElement, phone);
    fixture.detectChanges();
  }

  async function save(): Promise<void> {
    clickButton(el, 'Guardar cita');
    fixture.detectChanges();
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
  }

  function alerts(): string[] {
    return Array.from(el.querySelectorAll('form > [role="alert"]')).map((a) => text(a));
  }

  function demoTools(): { set(value: boolean): void } {
    return (fixture.componentInstance as unknown as { showDemoTools: { set(value: boolean): void } })
      .showDemoTools;
  }

  it('shows the staff labels and the initial day', async () => {
    expect(text(el)).toContain('Nueva cita manual');
    expect(text(el)).toContain('Para solicitudes recibidas por llamada o WhatsApp. Aplica las mismas reglas que la web.');
    expect(text(el)).toContain('Nombre completo del paciente');
    expect(text(el)).toContain('Celular del paciente');
    expect(el.querySelector('[aria-label="Día"] [aria-checked="true"]')?.textContent).toContain('14');
  });

  it('asks for the slot first', async () => {
    fillPatient('Ana Pérez', '300 999 8877');
    await save();
    expect(alerts()).toEqual(['Completa odontólogo, procedimiento, día y hora.']);
  });

  it('creates a manual appointment', async () => {
    await pickSlot();
    fillPatient('Ana Pérez', '300 999 8877');
    await save();
    expect(store.createAppointment).toHaveBeenCalledTimes(1);
    expect(store.createAppointment).toHaveBeenCalledWith({
      dentistId: 'd1',
      procedureId: 'p1',
      date: '2026-10-15',
      time: '10:00',
      patientName: 'Ana Pérez',
      patientPhone: '3009998877',
      origin: 'Manual',
    });
    expect(text(el.querySelector('[role="status"]') as HTMLElement)).toBe(
      'Cita VD-4000 registrada. El recordatorio por WhatsApp quedó programado.',
    );
    clickButton(el, 'Registrar otra cita');
    fixture.detectChanges();
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('shows the conflict message when the store reports a conflict', async () => {
    store.createAppointment.mockResolvedValue({ ok: false, reason: 'conflicto' });
    await pickSlot();
    fillPatient('Ana Pérez', '300 999 8877');
    await save();
    expect(alerts()).toEqual([CONFLICT]);
    expect(el.querySelector('[aria-label="Horarios de la mañana"] [aria-checked="true"]')).toBeNull();
  });

  it('simulates a conflict with the demo checkbox', async () => {
    await pickSlot();
    fillPatient('Ana Pérez', '300 999 8877');
    (el.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    fixture.detectChanges();
    await save();
    expect(alerts()).toEqual([CONFLICT]);
    expect(store.createAppointment).not.toHaveBeenCalled();
  });

  it('hides the demo conflict checkbox outside dev mode', async () => {
    demoTools().set(false);
    fixture.detectChanges();
    expect(el.querySelector('input[type="checkbox"]')).toBeNull();
    expect(text(el)).not.toContain('simular que otro usuario tomó el horario');
  });

  it('still creates the appointment when the demo tools are hidden', async () => {
    demoTools().set(false);
    fixture.detectChanges();
    await pickSlot();
    fillPatient('Ana Pérez', '300 999 8877');
    await save();
    expect(store.createAppointment).toHaveBeenCalledTimes(1);
    const status = el.querySelector('[role="status"]') as HTMLElement;
    expect(status.classList).toContain('text-success');
    expect(status.classList).not.toContain('text-emerald-800');
  });

  it('blocks a second active appointment for the same phone', async () => {
    store.createAppointment.mockResolvedValue({ ok: false, reason: 'cita-activa' });
    await pickSlot();
    fillPatient('Rosa Elvira Jaimes', '313 555 6677');
    await save();
    expect(alerts()).toEqual([
      'El paciente con celular 313 555 6677 ya tiene una cita activa. ' +
        'Solo se permite una cita activa por paciente. Reprograma o cancela esa cita desde la agenda antes de crear una nueva.',
    ]);
  });

  it('validates the patient data', async () => {
    await pickSlot();
    fillPatient('Ana', '123');
    await save();
    expect(text(el)).toContain('Escribe nombre y apellido.');
    expect(text(el)).toContain('El celular debe tener 10 dígitos.');
  });
});
