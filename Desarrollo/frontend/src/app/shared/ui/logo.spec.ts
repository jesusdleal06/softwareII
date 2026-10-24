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
    expect(link.getAttribute('aria-label')).toBe('Villadent, ir al inicio');
    expect(link.getAttribute('href')).toBe('/panel');
    expect(text(el)).toContain('AgendaPro');
  });

  it('shows the clinic logo as a decorative image named by the link', () => {
    const img = render().querySelector('a img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('brand/villadent-logo.png');
    // The link's aria-label already names it; an alt text would be read twice.
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('width')).toBe('374');
    expect(img.getAttribute('height')).toBe('160');
  });

  it('puts the logo on a white plate in dark mode so its dark text stays readable', () => {
    const plate = render().querySelector('a img')?.parentElement as HTMLElement;
    expect(plate.className).toContain('dark:bg-white');
  });
});
