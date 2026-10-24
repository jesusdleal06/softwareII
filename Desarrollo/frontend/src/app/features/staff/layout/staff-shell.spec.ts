import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
        // The real AppStore talks to the API: keep every request inside the test.
        provideHttpClient(),
        provideHttpClientTesting(),
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
    expect(el.querySelectorAll('nav')).toHaveLength(2);
  });

  it('labels the desktop and mobile navigation differently', async () => {
    const el = await open(ASSISTANT_SESSION, '/panel/agenda');
    const labels = Array.from(el.querySelectorAll('nav')).map((nav) => nav.getAttribute('aria-label'));
    expect(labels).toHaveLength(2);
    expect(labels.every((label) => !!label)).toBe(true);
    expect(new Set(labels).size).toBe(2);
  });

  it('offers a skip link into the main content', async () => {
    const el = await open(ASSISTANT_SESSION, '/panel/agenda');
    const skip = el.querySelector('a[href="#contenido"]') as HTMLAnchorElement;
    expect(skip).not.toBeNull();
    expect(text(skip)).toBe('Saltar al contenido');
    expect(el.querySelector('main#contenido')).not.toBeNull();
  });

  it('keeps the header shrinkable on narrow phones: the brand yields, the controls never do', async () => {
    const el = await open(ASSISTANT_SESSION, '/panel/agenda');
    const row = el.querySelector('header > div') as HTMLElement;
    const [brand, actions] = Array.from(row.children) as HTMLElement[];

    // jsdom has no layout, so this pins the structural contract that prevents a
    // horizontal page scroll at 360px: the brand block may shrink and truncate,
    // while the action block (theme, initials, logout) keeps its size. Removing
    // `min-w-0` or `shrink-0` brings the overflow back.
    expect(brand.className).toContain('min-w-0');
    expect(actions.className).toContain('shrink-0');
    const wordmark = Array.from(brand.querySelectorAll('span.truncate')).map((span) => text(span));
    expect(wordmark).toEqual(['Villadent', 'AgendaPro']);
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
