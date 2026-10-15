import { ComponentFixture, TestBed } from '@angular/core/testing';
import { clickButton, getByText, text } from '../../../shared/testing/dom';
import { DateNav } from './date-nav';

describe('DateNav', () => {
  let fixture: ComponentFixture<DateNav>;
  let el: HTMLElement;
  let emitted: string[];

  function render(date: string, today = '2026-10-14'): void {
    fixture = TestBed.createComponent(DateNav);
    fixture.componentRef.setInput('date', date);
    fixture.componentRef.setInput('today', today);
    emitted = [];
    fixture.componentInstance.dateChange.subscribe((d) => emitted.push(d));
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  it('shows the long and short date', () => {
    render('2026-10-14');
    expect(text(el)).toContain('miércoles 14 de octubre de 2026');
    expect(text(el)).toContain('14/10/2026');
  });

  it('moves one day back and forward, across months', () => {
    render('2026-11-01');
    (el.querySelector('[aria-label="Día anterior"]') as HTMLButtonElement).click();
    (el.querySelector('[aria-label="Día siguiente"]') as HTMLButtonElement).click();
    expect(emitted).toEqual(['2026-10-31', '2026-11-02']);
  });

  it('goes back to today and highlights "Hoy" only on today', () => {
    render('2026-10-20');
    expect(getByText(el, 'button', 'Hoy').classList).toContain('bg-card');
    clickButton(el, 'Hoy');
    expect(emitted).toEqual(['2026-10-14']);

    render('2026-10-14');
    const today = getByText(el, 'button', 'Hoy').classList;
    expect(today).toContain('border-primary');
    expect(today).toContain('bg-accent');
    expect(today).not.toContain('bg-card');
  });
});
