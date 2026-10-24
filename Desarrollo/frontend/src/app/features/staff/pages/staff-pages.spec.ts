import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { Session } from '../../../core/models';
import { makeAppointment } from '../../../core/testing/appointment.fixture';
import { CLOCK } from '../../../core/services/tokens';
import { clickButton, getByText, settle, text } from '../../../shared/testing/dom';
import { createFakeStore, provideFakeStore } from '../../../shared/testing/fake-store';
import { ASSISTANT_SESSION, DENTIST_SESSION } from '../../../shared/testing/session';

import '../layout/staff-shell';
import './agenda-page';
import './login-page';
import './access-denied-page';

const NOW = new Date(2026, 9, 14, 9, 10);

const APPOINTMENTS = [
  makeAppointment({ id: 'c1', code: 'VD-1046', patientName: 'Gloria Inés Mantilla', dentistId: 'd1', date: '2026-10-14', time: '08:30' }),
  makeAppointment({ id: 'c2', code: 'VD-1047', patientName: 'Sebastián Gómez', dentistId: 'd2', date: '2026-10-14', time: '10:00' }),
  makeAppointment({ id: 'c3', code: 'VD-1048', patientName: 'Hernando Ariza', dentistId: 'd3', date: '2026-10-14', time: '11:00' }),
  makeAppointment({ id: 'c9', code: 'VD-1049', patientName: 'Rosa Elvira Jaimes', dentistId: 'd1', date: '2026-10-14', time: '14:00', procedureId: 'p4', procedureName: 'Exodoncia', durationMinutes: 60 }),
  makeAppointment({ id: 'c10', code: 'VD-1050', patientName: 'María Fernanda Ruiz', dentistId: 'd1', date: '2026-10-15', time: '09:00' }),
  makeAppointment({ id: 'c11', code: 'VD-1051', patientName: 'Jorge Salazar', dentistId: 'd2', date: '2026-10-15', time: '10:00' }),
  makeAppointment({ id: 'c12', code: 'VD-1052', patientName: 'Lucía Prada', dentistId: 'd3', date: '2026-10-15', time: '11:00' }),
];

describe('staff pages', () => {
  let harness: RouterTestingHarness;

  async function open(url: string, session?: Session): Promise<HTMLElement> {
    const store = createFakeStore({ now: NOW, session: session ?? null, appointments: APPOINTMENTS.map((a) => ({ ...a })) });
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        provideFakeStore(store),
      ],
    });
    harness = await RouterTestingHarness.create(url);
    await settle();
    harness.detectChanges();
    return harness.fixture.nativeElement as HTMLElement;
  }

  it('renders the login page with the public header and footer', async () => {
    const el = await open('/ingreso');
    expect(text(el)).toContain('Ingreso del personal');
    expect(el.querySelector('header')).not.toBeNull();
    expect(el.querySelector('footer')).not.toBeNull();
    expect((el.querySelector('main > div') as HTMLElement).classList).toContain('max-w-5xl');
  });

  it('explains the denied route and links to the role screen', async () => {
    const el = await open('/acceso-denegado?ruta=%2Fpanel%2Freportes', DENTIST_SESSION);
    expect(text(el)).toContain('Acceso denegado');
    expect((el.querySelector('main > div') as HTMLElement).classList).toContain('max-w-5xl');
    expect(text(el)).toContain(
      'Tu rol no tiene permiso para ver esta sección (/panel/reportes). Si crees que es un error, comunícate con la administración.',
    );
    expect(getByText(el, 'a', 'Ir a mi agenda').getAttribute('href')).toBe('/panel/mi-agenda');
    expect(getByText(el, 'a', 'Volver al inicio').getAttribute('href')).toBe('/');
  });

  it('points anonymous visitors of the denied page to the login', async () => {
    const el = await open('/acceso-denegado');
    expect(text(el)).toContain('Tu rol no tiene permiso para ver esta sección. Si crees');
    expect(getByText(el, 'a', 'Ir al ingreso del personal').getAttribute('href')).toBe('/ingreso');
  });

  it('shows the full agenda with every dentist and the day count', async () => {
    const el = await open('/panel/agenda', ASSISTANT_SESSION);
    expect(text(el)).toContain('Agenda del día');
    expect(text(el)).toContain('4 citas registradas.');
    expect((el.querySelector('app-agenda-page') as HTMLElement).classList).toContain('gap-6');
    expect(el.querySelectorAll('[aria-label^="Agenda de "]')).toHaveLength(3);
    expect(text(el.querySelector('[aria-label="Leyenda de estados"]') as HTMLElement)).toBe(
      'Pendiente Confirmada Reprogramada Atendida No asistió Cancelada',
    );

    const filter = el.querySelector('#filtro-dentista') as HTMLSelectElement;
    filter.value = 'd2';
    filter.dispatchEvent(new Event('change'));
    harness.detectChanges();
    await settle();
    harness.detectChanges();
    expect(el.querySelectorAll('[aria-label^="Agenda de "]')).toHaveLength(1);
    expect(el.querySelector('[aria-label^="Agenda de "]')?.getAttribute('aria-label')).toBe(
      'Agenda de Dr. Andrés Peña',
    );
  });

  it('filters the day appointments by dentist', async () => {
    const el = await open('/panel/agenda', ASSISTANT_SESSION);
    expect(text(el)).toContain('4 citas registradas.');
    const filter = el.querySelector('#filtro-dentista') as HTMLSelectElement;
    filter.value = 'd2';
    filter.dispatchEvent(new Event('change'));
    harness.detectChanges();
    await settle();
    harness.detectChanges();
    expect(text(el)).toContain('1 cita registrada.');
    expect(text(el)).toContain('Sebastián Gómez');
    expect(text(el)).not.toContain('Rosa Elvira Jaimes');
    expect(text(el)).not.toContain('Gloria Inés Mantilla');
    filter.value = '';
    filter.dispatchEvent(new Event('change'));
    harness.detectChanges();
    await settle();
    harness.detectChanges();
    expect(text(el)).toContain('4 citas registradas.');
    expect(text(el)).toContain('Rosa Elvira Jaimes');
  });

  it('opens the appointment detail and the manual booking panel', async () => {
    const el = await open('/panel/agenda', ASSISTANT_SESSION);
    (el.querySelector('button[aria-label^="Rosa Elvira Jaimes,"]') as HTMLButtonElement).click();
    harness.detectChanges();
    await settle();
    harness.detectChanges();
    expect(text(el)).toContain('Cita VD-1049');
    (el.querySelector('dialog [aria-label="Cerrar"]') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(text(el)).not.toContain('Cita VD-1049');

    clickButton(el, 'Nueva cita manual');
    harness.detectChanges();
    await settle();
    harness.detectChanges();
    expect(text(el.querySelector('dialog') as HTMLElement)).toContain(
      'Para solicitudes recibidas por llamada o WhatsApp.',
    );
  });

  it('moves the agenda to the next day', async () => {
    const el = await open('/panel/agenda', ASSISTANT_SESSION);
    (el.querySelector('[aria-label="Día siguiente"]') as HTMLButtonElement).click();
    harness.detectChanges();
    await settle();
    harness.detectChanges();
    expect(text(el)).toContain('jueves 15 de octubre de 2026');
    expect(text(el)).toContain('3 citas registradas.');
  });
});
