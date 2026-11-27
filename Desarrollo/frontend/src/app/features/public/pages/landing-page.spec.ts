import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dentist } from '../../../core/models';
import { formatTime } from '../../../core/domain';
import {
  createFakeStore,
  DENTISTS,
  FakeStore,
  provideFakeStore,
} from '../../../shared/testing/fake-store';
import { settle, text } from '../../../shared/testing/dom';
import { LandingPage } from './landing-page';

// Wednesday 2026-10-14 09:10 (the project's fixture instant).
const NOW = new Date(2026, 9, 14, 9, 10);

describe('LandingPage', () => {
  let fixture: ComponentFixture<LandingPage>;
  let el: HTMLElement;
  let store: FakeStore;

  async function render(
    options: {
      availability?: string[];
      dentists?: Dentist[];
      catalogFailure?: boolean;
      availabilityFailure?: boolean;
    } = {},
  ): Promise<void> {
    store = createFakeStore({ now: NOW, session: null });
    if (options.dentists) store.dentistsState.set(options.dentists);
    store.availability.mockResolvedValue(options.availability ?? ['09:00', '10:00', '11:00']);
    if (options.catalogFailure)
      store.ensureCatalogs.mockRejectedValue(new Error('Catalog offline'));
    if (options.availabilityFailure)
      store.availability.mockRejectedValue(new Error('Availability offline'));
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideFakeStore(store)] });
    fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
    expect(text(el.querySelector('aside [role="status"]')!)).toBe(
      'Buscando los próximos horarios…',
    );
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
  }

  /** First section of the page: the hero. */
  function hero(): HTMLElement {
    return el.querySelector('main > section') as HTMLElement;
  }

  it('keeps the hero at four text elements: no brand pill and no tagline under the CTA', async () => {
    await render();
    // The availability panel is a separate object; count only the hero's copy.
    const copy = hero().cloneNode(true) as HTMLElement;
    copy.querySelector('aside')?.remove();
    // 1 headline + 1 subtext + 2 CTAs (primary + secondary) = 4.
    expect(copy.querySelectorAll('h1, h2, p, a, button').length).toBeLessThanOrEqual(4);

    const heroText = text(hero());
    expect(heroText).not.toContain('Centro Odontológico Villadent');
    expect(heroText).not.toContain('¿Ya tienes una cita?');
    expect(heroText).toContain('Agenda tu cita en 2 minutos');
  });

  it('renders no eyebrow or kicker label and no "Paso N" scenario tags', async () => {
    await render();
    expect(el.querySelectorAll('[class*="uppercase"]').length).toBe(0);
    expect(text(el)).not.toContain('Paso ');
  });

  it('differentiates its two content sections instead of repeating the three-card mold', async () => {
    await render();
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

  it('renders each specialty once when the description matches, and keeps a distinct description', async () => {
    const [first, second] = DENTISTS;
    const description = 'Atención preventiva para toda la familia.';
    await render({
      dentists: [
        { ...first, description: first.specialty },
        { ...second, description },
      ],
    });

    const profiles = [...el.querySelectorAll('[aria-labelledby="equipo"] li')].map((li) =>
      [...li.querySelectorAll('span:not([aria-hidden])')].map((label) => text(label)),
    );
    expect(profiles).toEqual([
      [first.name, first.specialty],
      [second.name, second.specialty, description],
    ]);
  });

  it('renders the decorative calendar check in the availability panel', async () => {
    await render();
    const icon = hero().querySelector('aside svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.querySelector('path[d]')).not.toBeNull();
  });

  it('feeds the hero panel with the real next-available slots from the store', async () => {
    await render();
    const panel = hero().querySelector('aside') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(text(panel)).toContain('Próximos horarios');

    const shownTimes = Array.from(panel.querySelectorAll('span'))
      .map((s) => s.textContent?.trim() ?? '')
      .filter((t) => /^\d{1,2}:\d{2} (AM|PM)$/.test(t));
    expect(shownTimes.length).toBeGreaterThan(0);
    for (const time of shownTimes)
      expect([formatTime('09:00'), formatTime('10:00'), formatTime('11:00')]).toContain(time);
  });

  it('shows an honest empty state when the agenda has no free slots', async () => {
    await render({ availability: [] });
    const panel = el.querySelector('aside') as HTMLElement;
    expect(text(panel)).toContain('No hay cupos en los próximos días');
  });
  it.each([{ catalogFailure: true }, { availabilityFailure: true }])(
    'shows a booking fallback instead of an empty agenda when loading fails: %j',
    async (failure) => {
      await render(failure);
      const panel = el.querySelector('aside')!;
      expect(text(panel)).toContain(
        'No pudimos cargar los horarios en este momento. Puedes agendar igual y elegir tu horario en el siguiente paso.',
      );
      expect(text(panel)).not.toContain('No hay cupos');
      expect(text(panel.querySelector('a[href="/agendar"]')!)).toBe('Ver todos los horarios');
    },
  );
  it.each([{ availability: [] }, { catalogFailure: true }])(
    'links to WhatsApp from the availability fallback and footer: %j',
    async (options) => {
      await render(options);
      for (const selector of ['aside', 'footer']) {
        const link = el.querySelector(`${selector} a[href="https://wa.me/573144223133"]`);
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.getAttribute('rel')).toBe('noopener');
        if (selector === 'aside') expect(text(link!)).toBe('Escríbenos por WhatsApp');
      }
    },
  );
  it('omits the team section when no dentists are available', async () => {
    await render({ dentists: [] });
    expect(el.querySelector('[aria-labelledby="equipo"]')).toBeNull();
  });
});
