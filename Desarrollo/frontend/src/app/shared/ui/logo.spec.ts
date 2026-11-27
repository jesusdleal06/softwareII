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

  it('keeps the accessible name, the href and the product name', () => {
    const el = render();
    const link = el.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('aria-label')).toBe('Villadent AgendaPro, ir al inicio');
    // The accessible name must contain the visible product name (axe label-content-name-mismatch).
    expect(link.getAttribute('aria-label')).toContain('AgendaPro');
    expect(link.getAttribute('href')).toBe('/panel');
    expect(text(el)).toContain('AgendaPro');
  });

  it('hides the product name on phones so the header controls fit', () => {
    const name = Array.from(render().querySelectorAll('a span')).find((span) => text(span) === 'AgendaPro') as HTMLElement;
    expect(name.className).toContain('hidden');
    expect(name.className).toContain('sm:block');
  });

  it('shows the clinic logo as a decorative image named by the link', () => {
    const images = Array.from(render().querySelectorAll('a img'));
    // The link's aria-label already names it; an alt text would be read twice.
    expect(images.map((img) => img.getAttribute('alt'))).toEqual(['', '']);
    expect(images.map((img) => img.getAttribute('height'))).toEqual(['160', '160']);
    expect(images[0].getAttribute('src')).toBe('brand/villadent-logo.png');
    expect(images[0].getAttribute('width')).toBe('371');
  });

  it('swaps to the logo drawn for the dark ground instead of plating the light one', () => {
    const [light, dark] = Array.from(render().querySelectorAll('a img'));
    expect(light.className).toContain('dark:hidden');
    expect(dark.getAttribute('src')).toBe('brand/villadent-logo-dark.png');
    expect(dark.getAttribute('width')).toBe('377');
    expect(dark.className).toContain('hidden');
    expect(dark.className).toContain('dark:block');
    // One logo per theme: no white plate behind either of them.
    expect(light.parentElement?.className).not.toContain('dark:bg-white');
  });
});
