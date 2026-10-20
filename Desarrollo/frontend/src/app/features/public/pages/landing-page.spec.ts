import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStore } from '../../../core/services/app-store.service';
import { CLOCK, SESSION_STORAGE } from '../../../core/services/tokens';
import { addDays, formatTime, toDateKey } from '../../../core/domain';
import { text } from '../../../shared/testing/dom';
import { LandingPage } from './landing-page';

// Wednesday 2026-10-14 09:10 (the project's fixture instant).
const NOW = new Date(2026, 9, 14, 9, 10);

describe('LandingPage', () => {
  let fixture: ComponentFixture<LandingPage>;
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
    fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  /** First section of the page: the hero. */
  function hero(): HTMLElement {
    return el.querySelector('main > section') as HTMLElement;
  }

  it('keeps the hero at four text elements: no brand pill and no tagline under the CTA', () => {
    // The availability panel is a separate object; count only the hero's copy.
    const copy = hero().cloneNode(true) as HTMLElement;
    copy.querySelector('aside')?.remove();
    // 1 headline + 1 subtext + 2 CTAs (primary + secondary) = 4.
    expect(copy.querySelectorAll('h1, h2, p, a, button').length).toBeLessThanOrEqual(4);

    const heroText = text(hero());
    expect(heroText).not.toContain('Centro Odontológico Villadent');
    expect(heroText).not.toContain('¿Ya tienes una cita?');
    expect(heroText).toContain('Agenda tu cita en Villadent en menos de 2 minutos');
  });

  it('renders no eyebrow or kicker label and no "Paso N" scenario tags', () => {
    expect(el.querySelectorAll('[class*="uppercase"]').length).toBe(0);
    expect(text(el)).not.toContain('Paso ');
  });

  it('differentiates its two content sections instead of repeating the three-card mold', () => {
    const how = el.querySelector('[aria-labelledby="como-funciona"]') as HTMLElement;
    const team = el.querySelector('[aria-labelledby="equipo"]') as HTMLElement;
    expect(how).not.toBeNull();
    expect(team).not.toBeNull();
    // Neither section may render three identical bordered cards again.
    const cardMold = (section: HTMLElement) =>
      Array.from(section.querySelectorAll('li')).filter(
        (li) => /rounded-2xl/.test(li.className) && /\bborder\b/.test(li.className),
      );
    expect(cardMold(how).length).toBeLessThan(3);
    expect(cardMold(team).length).toBeLessThan(3);
    // The two sections use different layout families (a flow vs. a grid).
    expect(how.querySelector('ol')?.className).not.toBe(team.querySelector('ul')?.className);
  });

  it('feeds the hero panel with the real next-available slots from the store', () => {
    const panel = hero().querySelector('aside') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(text(panel)).toContain('Próximos horarios');

    // Every time the panel shows must exist in the store's own availability for
    // one of the next seven days (the window the panel can draw from).
    const available = new Set<string>();
    for (let offset = 0; offset < 7; offset++) {
      const date = toDateKey(addDays(NOW, offset));
      for (const dentistId of ['d1', 'd2', 'd3']) {
        for (const slot of store.availableSlots({ dentistId, date, durationMinutes: 30 })) {
          available.add(formatTime(slot));
        }
      }
    }
    const shownTimes = Array.from(panel.querySelectorAll('span'))
      .map((s) => s.textContent?.trim() ?? '')
      .filter((t) => /^\d{1,2}:\d{2} (AM|PM)$/.test(t));
    expect(shownTimes.length).toBeGreaterThan(0);
    for (const time of shownTimes) expect(available.has(time)).toBe(true);
  });

  it('shows an honest empty state when the agenda has no free slots', () => {
    vi.spyOn(store, 'availableSlots').mockReturnValue([]);
    fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const panel = (fixture.nativeElement as HTMLElement).querySelector('aside') as HTMLElement;
    expect(text(panel)).toContain('No hay cupos en los próximos días');
    vi.restoreAllMocks();
  });
});
