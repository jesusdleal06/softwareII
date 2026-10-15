import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStore } from '../../../core/services/app-store.service';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { clickButton, getByText, text, typeInto } from '../../../shared/testing/dom';
import { NewAppointmentPanel } from './new-appointment-panel';

// Wednesday 2026-10-14 09:10; Thursday 15 at 10:00 is free for Dra. Villamizar (d1).
const NOW = new Date(2026, 9, 14, 9, 10);
const CONFLICT = 'Este horario acaba de ser ocupado, elige otro.';

describe('NewAppointmentPanel', () => {
  let fixture: ComponentFixture<NewAppointmentPanel>;
  let el: HTMLElement;
  let store: AppStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: null },
      ],
    });
    store = TestBed.inject(AppStore);
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

  function pickSlot(): void {
    select('#sp-dentista-select', 'd1');
    select('#sp-proc-select', 'p1');
    getByText(el, '[aria-label="Día"] button', '15').click();
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

  function save(): void {
    clickButton(el, 'Guardar cita');
    fixture.detectChanges();
  }

  function alerts(): string[] {
    return Array.from(el.querySelectorAll('form > [role="alert"]')).map((a) => text(a));
  }

  it('shows the staff labels and the initial day', () => {
    expect(text(el)).toContain('Nueva cita manual');
    expect(text(el)).toContain('Para solicitudes recibidas por llamada o WhatsApp. Aplica las mismas reglas que la web.');
    expect(text(el)).toContain('Nombre completo del paciente');
    expect(text(el)).toContain('Celular del paciente');
    expect(el.querySelector('[aria-label="Día"] [aria-checked="true"]')?.textContent).toContain('14');
  });

  it('asks for the slot first', () => {
    fillPatient('Ana Pérez', '300 999 8877');
    save();
    expect(alerts()).toEqual(['Completa odontólogo, procedimiento, día y hora.']);
  });

  it('creates a manual appointment', () => {
    const before = store.appointments().length;
    pickSlot();
    fillPatient('Ana Pérez', '300 999 8877');
    save();
    const created = store.appointments()[before];
    expect(created).toMatchObject({
      dentistId: 'd1',
      procedureId: 'p1',
      date: '2026-10-15',
      time: '10:00',
      patientName: 'Ana Pérez',
      patientPhone: '3009998877',
      origin: 'Manual',
      status: 'Pendiente',
    });
    expect(text(el.querySelector('[role="status"]') as HTMLElement)).toBe(
      `Cita ${created.code} registrada. El recordatorio por WhatsApp quedó programado.`,
    );
    clickButton(el, 'Registrar otra cita');
    fixture.detectChanges();
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('shows the conflict message when the store reports a conflict', () => {
    vi.spyOn(store, 'createAppointment').mockReturnValue({ ok: false, reason: 'conflicto' });
    pickSlot();
    fillPatient('Ana Pérez', '300 999 8877');
    save();
    expect(alerts()).toEqual([CONFLICT]);
    expect(el.querySelector('[aria-label="Horarios de la mañana"] [aria-checked="true"]')).toBeNull();
  });

  it('simulates a conflict with the demo checkbox', () => {
    const before = store.appointments().length;
    pickSlot();
    fillPatient('Ana Pérez', '300 999 8877');
    (el.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    fixture.detectChanges();
    save();
    expect(alerts()).toEqual([CONFLICT]);
    expect(store.appointments()).toHaveLength(before);
  });

  it('blocks a second active appointment for the same phone', () => {
    pickSlot();
    fillPatient('Rosa Elvira Jaimes', '313 555 6677');
    save();
    expect(alerts()).toEqual([
      'El paciente con celular 313 555 6677 ya tiene una cita activa: VD-1049 el 14/10/2026 a las 2:00 PM. ' +
        'Solo se permite una cita activa por paciente. Reprograma o cancela esa cita desde la agenda antes de crear una nueva.',
    ]);
  });

  it('validates the patient data', () => {
    pickSlot();
    fillPatient('Ana', '123');
    save();
    expect(text(el)).toContain('Escribe nombre y apellido.');
    expect(text(el)).toContain('El celular debe tener 10 dígitos.');
  });
});
