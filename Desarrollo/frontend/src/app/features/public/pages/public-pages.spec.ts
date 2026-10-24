import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { makeAppointment } from '../../../core/testing/appointment.fixture';
import { CLOCK } from '../../../core/services/tokens';
import { getByText, settle, text } from '../../../shared/testing/dom';
import { createFakeStore, provideFakeStore } from '../../../shared/testing/fake-store';

// Eager imports so the lazy routes resolve quickly (the first load of the icon bundle is slow).
import './landing-page';
import './booking-page';
import './appointment-page';

const NOW = new Date(2026, 9, 14, 9, 10);

const ACTIVE = makeAppointment({
  id: 'a1',
  code: 'VD-1049',
  patientName: 'Rosa Elvira Jaimes',
  dentistName: 'Dra. Laura Villamizar',
  procedureName: 'Exodoncia',
  procedureId: 'p4',
  durationMinutes: 60,
  date: '2026-10-14',
  time: '14:00',
});

describe('public pages', () => {
  beforeEach(() => {
    const store = createFakeStore({ now: NOW, session: null });
    store.managed.mockImplementation(async (token: string) => (token === 'token-1' ? ACTIVE : null));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        provideFakeStore(store),
      ],
    });
  });

  async function open(url: string): Promise<HTMLElement> {
    const harness = await RouterTestingHarness.create(url);
    await settle();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('renders the landing page', async () => {
    const el = await open('/');
    expect(text(el)).toContain('Agenda tu cita en Villadent en menos de 2 minutos');
    expect(getByText(el, 'a', 'Agendar mi cita').getAttribute('href')).toBe('/agendar');
    expect(text(el)).toContain('Dr. Andrés Peña');
    expect(text(el)).toContain('¿Cómo funciona?');
    expect(el.querySelector('header')).not.toBeNull();
    expect(el.querySelector('footer')).not.toBeNull();
  });

  it('renders the booking page', async () => {
    const el = await open('/agendar');
    expect(text(el)).toContain('Elige tu horario');
  });

  it('binds the appointment token and action from the URL', async () => {
    const el = await open('/cita/token-1');
    expect(text(el)).toContain('Hola, Rosa');
  });

  it('opens the reschedule view with ?accion=reprogramar', async () => {
    const el = await open('/cita/token-1?accion=reprogramar');
    expect(text(el)).toContain('Elige tu nuevo horario');
    expect(text(el)).toContain('VD-1049');
  });

  it('shows the not-found state for an unknown token', async () => {
    const el = await open('/cita/NOPE');
    expect(text(el)).toContain('No encontramos esta cita');
  });
});
