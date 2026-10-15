import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { Session } from '../models';
import { CLOCK, SESSION_STORAGE } from '../services/tokens';
import { ASSISTANT_SESSION, DENTIST_SESSION, memoryStorage } from '../../shared/testing/session';
import { landingPathFor } from './staff-access';

// Eager imports so the lazy routes resolve quickly.
import '../../features/staff/layout/staff-shell';
import '../../features/staff/pages/agenda-page';
import '../../features/staff/pages/my-agenda-page';
import '../../features/staff/pages/reports-page';
import '../../features/staff/pages/login-page';
import '../../features/staff/pages/access-denied-page';

const NOW = new Date(2026, 9, 14, 9, 10);

describe('staff access guards', () => {
  function setup(session?: Session): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: memoryStorage(session) },
      ],
    });
  }

  async function navigate(url: string): Promise<string> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  it('lands each role on its own screen', () => {
    expect(landingPathFor(null)).toBe('/ingreso');
    expect(landingPathFor(ASSISTANT_SESSION)).toBe('/panel/agenda');
    expect(landingPathFor(DENTIST_SESSION)).toBe('/panel/mi-agenda');
  });

  it.each(['/panel/agenda', '/panel/mi-agenda', '/panel/reportes', '/panel'])(
    'sends unauthenticated users from %s to /ingreso',
    async (url) => {
      setup();
      expect(await navigate(url)).toBe('/ingreso');
    },
  );

  it('sends the dentist to /acceso-denegado when opening reports', async () => {
    setup(DENTIST_SESSION);
    expect(await navigate('/panel/reportes')).toBe('/acceso-denegado?ruta=%2Fpanel%2Freportes');
  });

  it('sends the dentist to /acceso-denegado when opening the full agenda', async () => {
    setup(DENTIST_SESSION);
    expect(await navigate('/panel/agenda')).toBe('/acceso-denegado?ruta=%2Fpanel%2Fagenda');
  });

  it('sends the assistant to /acceso-denegado when opening mi-agenda', async () => {
    setup(ASSISTANT_SESSION);
    expect(await navigate('/panel/mi-agenda')).toBe('/acceso-denegado?ruta=%2Fpanel%2Fmi-agenda');
  });

  it.each([
    [ASSISTANT_SESSION, '/panel/agenda'],
    [ASSISTANT_SESSION, '/panel/reportes'],
    [DENTIST_SESSION, '/panel/mi-agenda'],
  ])('lets an allowed role open its screen (%#)', async (session, url) => {
    setup(session);
    expect(await navigate(url)).toBe(url);
  });

  it('redirects /panel to the role landing screen', async () => {
    setup(DENTIST_SESSION);
    expect(await navigate('/panel')).toBe('/panel/mi-agenda');
  });
});
