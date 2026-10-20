import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY } from '../browser/theme';
import { ThemeToggle } from './theme-toggle';

@Component({
  imports: [ThemeToggle],
  template: `<app-theme-toggle />`,
})
class Host {}

describe('ThemeToggle', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;

  function control(): HTMLButtonElement {
    const button = el.querySelector('button');
    if (!button) throw new Error('the toggle does not render a <button>');
    return button;
  }

  function render(): void {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  function press(): void {
    control().click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    render();
  });

  it('starts in light mode and offers to switch to dark', () => {
    expect(control().getAttribute('aria-label')).toBe('Cambiar a tema oscuro');
    expect(control().getAttribute('aria-pressed')).toBe('false');
    expect(control().getAttribute('type')).toBe('button');
  });

  it('switches to dark, remembers it and flips its own label', () => {
    press();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(control().getAttribute('aria-label')).toBe('Cambiar a tema claro');
    expect(control().getAttribute('aria-pressed')).toBe('true');
  });

  it('switches back to light', () => {
    press();
    press();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(control().getAttribute('aria-label')).toBe('Cambiar a tema oscuro');
  });

  it('shows the theme a returning visitor already had applied', () => {
    // The bootstrap in index.html applies the stored theme before first paint.
    document.documentElement.classList.add('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render();
    expect(control().getAttribute('aria-label')).toBe('Cambiar a tema claro');
    expect(control().getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps a 44px touch target and hides the icon from assistive tech', () => {
    expect(control().className).toContain('size-12');
    expect(control().className).toContain('rounded-xl');
    expect(control().className).toContain('focus-visible:ring-2');
    expect(control().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
