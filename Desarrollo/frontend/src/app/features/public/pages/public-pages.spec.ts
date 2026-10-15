import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { getByText, text } from '../../../shared/testing/dom';

// Eager imports so the lazy routes resolve quickly (the first load of the icon bundle is slow).
import './landing-page';
import './booking-page';
import './appointment-page';

const NOW = new Date(2026, 9, 14, 9, 10);

describe('public pages', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: null },
      ],
    });
  });

  it('renders the landing page', async () => {
    const harness = await RouterTestingHarness.create('/');
    const el = harness.routeNativeElement as HTMLElement;
    expect(text(el)).toContain('Agenda tu cita en Villadent en menos de 2 minutos');
    expect(getByText(el, 'a', 'Agendar mi cita').getAttribute('href')).toBe('/agendar');
    expect(getByText(el, 'a', 'Consúltala con el enlace de tu WhatsApp').getAttribute('href')).toBe('/cita/VD-1049');
    expect(text(el)).toContain('Dr. Andrés Peña');
    expect(text(el)).toContain('¿Cómo funciona?');
    expect(el.querySelector('header')).not.toBeNull();
    expect(el.querySelector('footer')).not.toBeNull();
  });

  it('renders the booking page', async () => {
    const harness = await RouterTestingHarness.create('/agendar');
    expect(text(harness.routeNativeElement as HTMLElement)).toContain('Paso 1 de 3');
  });

  it('binds the appointment code and action from the URL', async () => {
    const harness = await RouterTestingHarness.create('/cita/VD-1049');
    expect(text(harness.routeNativeElement as HTMLElement)).toContain('Hola, Rosa');
  });

  it('opens the reschedule view with ?accion=reprogramar', async () => {
    const harness = await RouterTestingHarness.create('/cita/VD-1049?accion=reprogramar');
    expect(text(harness.routeNativeElement as HTMLElement)).toContain('Reprogramar cita VD-1049');
  });

  it('shows the not-found state for an unknown code', async () => {
    const harness = await RouterTestingHarness.create('/cita/NOPE');
    expect(text(harness.routeNativeElement as HTMLElement)).toContain('No encontramos esta cita');
  });
});
