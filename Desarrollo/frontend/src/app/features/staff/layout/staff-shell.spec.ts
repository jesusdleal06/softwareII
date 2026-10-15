import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { Session } from '../../../core/models';
import { AppStore } from '../../../core/services/app-store.service';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { clickButton, text } from '../../../shared/testing/dom';
import { ASSISTANT_SESSION, DENTIST_SESSION, memoryStorage, SESSION_KEY } from '../../../shared/testing/session';

import './staff-shell';
import '../pages/agenda-page';
import '../pages/my-agenda-page';
import '../pages/reports-page';
import '../pages/login-page';

const NOW = new Date(2026, 9, 14, 9, 10);

describe('StaffShell', () => {
  let storage: ReturnType<typeof memoryStorage>;
  let harness: RouterTestingHarness;

  async function open(session: Session, url: string): Promise<HTMLElement> {
    storage = memoryStorage(session);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: CLOCK, useValue: () => new Date(NOW) },
        { provide: SESSION_STORAGE, useValue: storage },
      ],
    });
    harness = await RouterTestingHarness.create(url);
    return harness.fixture.nativeElement as HTMLElement;
  }

  function navLabels(el: HTMLElement): string[] {
    const nav = el.querySelector('nav[aria-label="Secciones del panel"]') as HTMLElement;
    return Array.from(nav.querySelectorAll('a')).map((a) => text(a));
  }

  it('shows the assistant name, role and her sections', async () => {
    const el = await open(ASSISTANT_SESSION, '/panel/agenda');
    const header = el.querySelector('header') as HTMLElement;
    expect(text(header)).toContain('Ana María Rueda');
    expect(text(header)).toContain('Auxiliar administrativa');
    expect(navLabels(el)).toEqual(['Agenda', 'Reportes']);
    const active = el.querySelector('nav a[aria-current="page"]');
    expect(active?.getAttribute('href')).toBe('/panel/agenda');
    expect(el.querySelector('header a[aria-label="Villadent, ir al inicio"]')?.getAttribute('href')).toBe(
      '/panel/agenda',
    );
  });

  it('shows only "Mi agenda" to the dentist, with her initials', async () => {
    const el = await open(DENTIST_SESSION, '/panel/mi-agenda');
    expect(navLabels(el)).toEqual(['Mi agenda']);
    expect(text(el.querySelector('header') as HTMLElement)).toContain('Dra. Laura Villamizar');
    expect(text(el.querySelector('header span.rounded-full') as HTMLElement)).toBe('LV');
    expect(el.querySelectorAll('nav[aria-label="Secciones del panel"]')).toHaveLength(2);
  });

  it('logs out and goes to /ingreso', async () => {
    const el = await open(ASSISTANT_SESSION, '/panel/agenda');
    clickButton(el, 'Cerrar sesión');
    await harness.fixture.whenStable();
    expect(TestBed.inject(AppStore).session()).toBeNull();
    expect(storage.data.has(SESSION_KEY)).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/ingreso');
  });
});
