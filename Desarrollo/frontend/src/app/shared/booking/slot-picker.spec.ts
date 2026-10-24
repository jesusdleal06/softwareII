import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createFakeStore, FakeStore, provideFakeStore } from '../testing/fake-store';
import { getByText, settle, text } from '../testing/dom';
import { SlotPicker, SlotSelection } from './slot-picker';

// Wednesday 2026-10-14 09:10. On Thursday 15 Dra. Villamizar (d1) is busy 09:00–09:45.
const NOW = new Date(2026, 9, 14, 9, 10);
const THURSDAY = '2026-10-15';

describe('SlotPicker', () => {
  let fixture: ComponentFixture<SlotPicker>;
  let emitted: SlotSelection[];
  let store: FakeStore;

  beforeEach(() => {
    store = createFakeStore({ now: NOW, session: null });
    store.availability.mockImplementation(async (dentistId: string, _procedureId: string, date: string) => {
      if (date !== THURSDAY) return [];
      if (dentistId === 'd3') return ['09:00'];
      if (dentistId === 'd2') return ['10:00'];
      return ['08:00', '08:30', '10:00', '10:30', '11:00', '14:00'];
    });
    TestBed.configureTestingModule({ providers: [provideFakeStore(store)] });
  });

  async function render(value: SlotSelection, extra: Record<string, unknown> = {}): Promise<HTMLElement> {
    fixture = TestBed.createComponent(SlotPicker);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('dentists', store.dentists());
    fixture.componentRef.setInput('procedures', store.procedures());
    fixture.componentRef.setInput('now', NOW);
    for (const [key, v] of Object.entries(extra)) fixture.componentRef.setInput(key, v);
    emitted = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
    fixture.detectChanges();
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function hours(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('[aria-label^="Horarios de la"] button')).map((b) => text(b));
  }

  it('asks for the missing choices before showing hours', async () => {
    const el = await render({ dentistId: '', procedureId: '', date: '', time: '' });
    expect(text(el)).toContain(
      'Selecciona el odontólogo, el procedimiento y el día para ver los horarios disponibles.',
    );
    expect(hours(el)).toEqual([]);
  });

  it('lets the week range shrink so the row fits a 320px viewport', async () => {
    // Two 48px buttons plus the range must fit inside 288px of content width.
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: THURSDAY, time: '' });
    const range = Array.from(el.querySelectorAll('span')).find((span) => span.className.includes('text-center'));
    expect(range, 'week range label').toBeDefined();
    expect(range?.classList.contains('min-w-0')).toBe(true);
    expect(range?.classList.contains('min-w-44')).toBe(false);
    expect(range?.classList.contains('sm:min-w-44')).toBe(true);
  });

  it('renders only the free slots of the chosen dentist and procedure', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: THURSDAY, time: '' });
    const shown = hours(el);
    expect(shown).toContain('8:00 AM');
    expect(shown).toContain('8:30 AM');
    expect(shown).toContain('10:00 AM');
    expect(shown).not.toContain('9:00 AM');
    expect(shown).not.toContain('9:30 AM');
    expect(shown).not.toContain('3:00 PM');
    expect(text(el)).toContain('Solo se muestran horarios donde caben los 30 minutos');
  });

  it('uses the agenda of each dentist independently', async () => {
    const el = await render({ dentistId: 'd3', procedureId: 'p1', date: THURSDAY, time: '' });
    expect(hours(el)).toContain('9:00 AM');
  });

  it('emits the chosen hour keeping the rest of the selection', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: THURSDAY, time: '' });
    getByText<HTMLButtonElement>(el, '[aria-label="Horarios de la mañana"] button', '10:00 AM').click();
    expect(emitted).toEqual([{ dentistId: 'd1', procedureId: 'p1', date: THURSDAY, time: '10:00' }]);
  });

  it('clears the hour when the dentist changes', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: THURSDAY, time: '10:00' });
    getByText<HTMLButtonElement>(el, '[aria-label="Odontólogo"] button', 'Dr. Andrés Peña').click();
    expect(emitted).toEqual([{ dentistId: 'd2', procedureId: 'p1', date: THURSDAY, time: '' }]);
  });

  it('disables past days and the previous-week button in the current week', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: '', time: '' });
    const days = el.querySelectorAll<HTMLButtonElement>('[aria-label="Día"] button');
    expect(days).toHaveLength(6);
    expect(days[0].disabled).toBe(true); // Monday 12
    expect(days[2].disabled).toBe(false); // today
    expect(text(days[2])).toContain('Hoy');
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Semana anterior"]')?.disabled).toBe(true);
    expect(text(el)).toContain('12 - 17 de octubre de 2026');
  });

  it('navigates to the next week', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: '', time: '' });
    el.querySelector<HTMLButtonElement>('[aria-label="Semana siguiente"]')?.click();
    fixture.detectChanges();
    expect(text(el)).toContain('19 - 24 de octubre de 2026');
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Semana anterior"]')?.disabled).toBe(false);
  });

  it('shows the fixed dentist and procedure when rescheduling', async () => {
    const el = await render(
      { dentistId: 'd1', procedureId: 'p4', date: '', time: '' },
      { fixedDentist: true, fixedProcedure: true },
    );
    expect(el.querySelector('[aria-label="Odontólogo"]')).toBeNull();
    expect(text(el)).toContain('Dra. Laura Villamizar');
    expect(text(el)).toContain('Exodoncia');
    expect(text(el)).toContain('Hora disponible');
  });

  it('uses selects in compact mode', async () => {
    const el = await render({ dentistId: '', procedureId: '', date: '', time: '' }, { compact: true });
    const select = el.querySelector<HTMLSelectElement>('#sp-dentista-select') as HTMLSelectElement;
    select.value = 'd3';
    select.dispatchEvent(new Event('change'));
    expect(emitted).toEqual([{ dentistId: 'd3', procedureId: '', date: '', time: '' }]);
  });

  it('applies the nav button styles through a real class binding', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: '', time: '' });
    const next = el.querySelector<HTMLButtonElement>('[aria-label="Semana siguiente"]') as HTMLButtonElement;
    expect(next.className).toContain('rounded-xl');
    expect(next.className).toContain('size-12');
    expect(next.className).not.toContain('${');
  });

  it('applies the empty hint styles through a real class binding', async () => {
    const el = await render({ dentistId: '', procedureId: '', date: '', time: '' });
    const hint = Array.from(el.querySelectorAll('p')).find((p) =>
      text(p).includes('para ver los horarios disponibles'),
    ) as HTMLElement;
    expect(hint.className).toContain('border-dashed');
    expect(hint.className).not.toContain('${');
  });

  it('supports radiogroups with roving tabindex and arrow keys', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: THURSDAY, time: '10:00' });
    expect(el.querySelectorAll('[role="radiogroup"]').length).toBeGreaterThan(0);
    const morning = el.querySelector('[aria-label="Horarios de la mañana"]') as HTMLElement;
    const buttons = Array.from(morning.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.length).toBeGreaterThan(1);
    const selected = getByText<HTMLButtonElement>(morning, 'button', '10:00 AM');
    expect(selected.getAttribute('role')).toBe('radio');
    expect(selected.getAttribute('aria-checked')).toBe('true');
    expect(selected.tabIndex).toBe(0);
    expect(buttons.filter((b) => b !== selected).every((b) => b.tabIndex === -1)).toBe(true);
    const next = buttons[buttons.indexOf(selected) + 1];
    selected.focus();
    selected.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(next);
    expect(emitted.length).toBe(1);
    expect(emitted[0].time).not.toBe('10:00');
  });

  it('keeps the first enabled day as the tab stop when nothing is checked', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: '', time: '' });
    const days = Array.from(el.querySelectorAll<HTMLButtonElement>('[aria-label="Día"] button'));
    const tabbable = days.filter((d) => d.tabIndex === 0 && !d.disabled);
    expect(tabbable).toHaveLength(1);
    expect(text(tabbable[0])).toContain('Hoy');
  });

  it('labels picker sections with h2 headings', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: THURSDAY, time: '' });
    expect(el.querySelector('h3')).toBeNull();
    expect(el.querySelectorAll('h2')).toHaveLength(4);
  });

  it('formats the week range with a hyphen separator', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: '', time: '' });
    expect(text(el)).toContain('12 - 17 de octubre de 2026');
    expect(text(el)).not.toMatch(/[–—]/);
  });

  it('shows focus with a full-opacity 2px ring on picker controls', async () => {
    const el = await render({ dentistId: 'd1', procedureId: 'p1', date: THURSDAY, time: '' });
    const controls = [
      el.querySelector('[aria-label="Semana siguiente"]') as HTMLElement,
      el.querySelector('[aria-label="Día"] button') as HTMLElement,
      getByText<HTMLButtonElement>(el, '[aria-label="Horarios de la mañana"] button', '8:00 AM'),
    ];
    for (const control of controls) {
      expect(control.className).toContain('focus-visible:ring-2');
      expect(control.className).toContain('focus-visible:ring-ring');
      expect(control.className).not.toContain('ring-4');
    }
  });
});
