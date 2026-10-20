import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { text } from '../testing/dom';
import { Logo } from './logo';

describe('Logo', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Logo);
    fixture.componentRef.setInput('href', '/panel');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows focus with a full-opacity 2px ring', () => {
    const link = render().querySelector('a') as HTMLAnchorElement;
    expect(link.className).toContain('focus-visible:ring-2');
    expect(link.className).toContain('focus-visible:ring-ring');
    expect(link.className).not.toContain('ring-3');
  });

  it('keeps the brand text, accessible name and href', () => {
    const el = render();
    const link = el.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('aria-label')).toBe('Villadent, ir al inicio');
    expect(link.getAttribute('href')).toBe('/panel');
    expect(text(el)).toContain('Villadent');
    expect(text(el)).toContain('AgendaPro');
  });
});
