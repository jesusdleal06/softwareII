import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BigButton } from './big-button';

@Component({
  imports: [BigButton],
  template: `
    <button type="button" appBigButton variant="primary" size="md" class="sm:w-auto">Primary</button>
    <a appBigButton variant="outline" size="lg" class="flex-1" href="/">Outline</a>
    <button type="button" appBigButton variant="danger" size="xl" [full]="true" class="mt-2">
      Danger
    </button>
  `,
})
class Host {}

describe('BigButton', () => {
  function render(): { buttons: HTMLButtonElement[]; link: HTMLAnchorElement } {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      buttons: Array.from(el.querySelectorAll('button')),
      link: el.querySelector('a') as HTMLAnchorElement,
    };
  }

  it('merges consumer classes instead of overwriting them', () => {
    const { buttons, link } = render();
    expect(buttons[0].className).toContain('sm:w-auto');
    expect(link.className).toContain('flex-1');
    expect(buttons[1].className).toContain('mt-2');
  });

  it('keeps internal variant and size classes next to consumer classes', () => {
    const { buttons, link } = render();
    expect(buttons[0].className).toContain('bg-primary');
    expect(buttons[0].className).toContain('min-h-12');
    expect(link.className).toContain('bg-background');
    expect(link.className).toContain('min-h-14');
    expect(buttons[1].className).toContain('bg-destructive');
    expect(buttons[1].className).toContain('min-h-16');
  });

  it('applies full width only when requested', () => {
    const { buttons } = render();
    expect(buttons[0].className).not.toContain('w-full');
    expect(buttons[1].className).toContain('w-full');
  });

  it('lets consumer classes win over conflicting internal utilities', () => {
    @Component({
      imports: [BigButton],
      template: `<button type="button" appBigButton size="lg" class="min-h-10">Custom</button>`,
    })
    class ConflictHost {}
    const fixture = TestBed.createComponent(ConflictHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.className).toContain('min-h-10');
    expect(button.className).not.toContain('min-h-14');
  });

  it('shows focus with a full-opacity 2px ring on buttons and links', () => {
    const { buttons, link } = render();
    for (const el of [...buttons, link]) {
      expect(el.className).toContain('focus-visible:ring-2');
      expect(el.className).toContain('focus-visible:ring-ring');
      expect(el.className).not.toContain('ring-4');
    }
  });
});
