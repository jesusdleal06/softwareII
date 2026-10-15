import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { Session } from '../../../core/models';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { clickButton, getByText, text } from '../../../shared/testing/dom';
import { ASSISTANT_SESSION, DENTIST_SESSION, memoryStorage } from '../../../shared/testing/session';

import '../layout/staff-shell';
import './agenda-page';
import './login-page';
import './access-denied-page';

const NOW = new Date(2026, 9, 14, 9, 10);

describe('staff pages', () => {
  let harness: RouterTestingHarness;

  async function open(url: string, session?: Session): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: memoryStorage(session) },
      ],
    });
    harness = await RouterTestingHarness.create(url);
    return harness.fixture.nativeElement as HTMLElement;
  }

  it('renders the login page with the public header and footer', async () => {
    const el = await open('/ingreso');
    expect(text(el)).toContain('Ingreso del personal');
    expect(el.querySelector('header')).not.toBeNull();
    expect(el.querySelector('footer')).not.toBeNull();
  });

  it('explains the denied route and links to the role screen', async () => {
    const el = await open('/acceso-denegado?ruta=%2Fpanel%2Freportes', DENTIST_SESSION);
    expect(text(el)).toContain('Acceso denegado');
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
    expect(el.querySelectorAll('[role="list"]')).toHaveLength(3);
    expect(text(el.querySelector('[aria-label="Leyenda de estados"]') as HTMLElement)).toBe(
      'Pendiente Confirmada Reprogramada Atendida No asistió Cancelada',
    );

    const filter = el.querySelector('#filtro-dentista') as HTMLSelectElement;
    filter.value = 'd2';
    filter.dispatchEvent(new Event('change'));
    harness.detectChanges();
    expect(el.querySelectorAll('[role="list"]')).toHaveLength(1);
    expect(el.querySelector('[role="list"]')?.getAttribute('aria-label')).toBe('Agenda de Dr. Andrés Peña');
  });

  it('opens the appointment detail and the manual booking panel', async () => {
    const el = await open('/panel/agenda', ASSISTANT_SESSION);
    (el.querySelector('button[aria-label^="Rosa Elvira Jaimes,"]') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(text(el)).toContain('Cita VD-1049');
    (el.querySelector('dialog [aria-label="Cerrar"]') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(text(el)).not.toContain('Cita VD-1049');

    clickButton(el, 'Nueva cita manual');
    harness.detectChanges();
    expect(text(el.querySelector('dialog') as HTMLElement)).toContain(
      'Para solicitudes recibidas por llamada o WhatsApp.',
    );
  });

  it('moves the agenda to the next day', async () => {
    const el = await open('/panel/agenda', ASSISTANT_SESSION);
    (el.querySelector('[aria-label="Día siguiente"]') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(text(el)).toContain('jueves 15 de octubre de 2026');
    expect(text(el)).toContain('3 citas registradas.');
  });
});
