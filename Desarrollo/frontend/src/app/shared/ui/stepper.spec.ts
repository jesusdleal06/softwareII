import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Stepper } from './stepper';
import { text } from '../testing/dom';

@Component({
  imports: [Stepper],
  template: `<ol appStepper [steps]="steps" [current]="2"></ol>`,
})
class Host {
  readonly steps = ['Elige tu horario', 'Tus datos', 'Confirma tu cita'];
}

describe('Stepper', () => {
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('marks only the current step with aria-current="step"', () => {
    const items = render().querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].getAttribute('aria-current')).toBeNull();
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[2].getAttribute('aria-current')).toBeNull();
  });

  it('shows a check for completed steps and numbers for the rest', () => {
    const items = render().querySelectorAll('li');
    expect(items[0].querySelector('svg')).not.toBeNull();
    expect(text(items[1])).toContain('2');
    expect(text(items[2])).toContain('Paso 3: Confirma tu cita');
  });

  it('labels the list as progress', () => {
    expect(render().querySelector('ol')?.getAttribute('aria-label')).toBe('Progreso');
  });

  it('collapses to the active label on small screens without losing the step name', () => {
    // Three step names do not fit a 320px row, so only the active one stays visible.
    const items = Array.from(render().querySelectorAll('li'));
    const visibleLabels = items.map((li) =>
      Array.from(li.querySelectorAll('span')).filter((span) => span.textContent?.trim() === ''),
    );
    const collapsed = items.map((li) =>
      Array.from(li.querySelectorAll('span > span')).some((span) => span.classList.contains('hidden')),
    );
    expect(collapsed).toEqual([true, false, true]);
    expect(visibleLabels).toHaveLength(3);
    // The accessible name keeps its step number even while the label text is hidden.
    expect(text(items[2])).toContain('Paso 3:');
  });
});
