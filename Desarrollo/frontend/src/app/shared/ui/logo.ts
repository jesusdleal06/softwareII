import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cn } from './class-names';

/** Tooth glyph used by the brand logo. */
@Component({
  selector: 'svg[appToothIcon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  },
  template: `<svg:path
    d="M12 5.5c-1.8-1.6-4.5-2.2-6.4-.8C3.6 6.2 3.2 9 4.3 11.5c1 2.3 1.5 4.6 1.9 7 .2 1.2 1.7 1.5 2.3.4L10 15.5c.7-1.3 2.3-1.3 3 0l1.5 3.4c.6 1.1 2.1.8 2.3-.4.4-2.4.9-4.7 1.9-7 1.1-2.5.7-5.3-1.3-6.8-1.9-1.4-4.6-.8-6.4.8Z"
  />`,
})
export class ToothIcon {}

@Component({
  selector: 'app-logo',
  imports: [RouterLink, ToothIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="href()"
      [class]="linkClass()"
      aria-label="Villadent, ir al inicio"
    >
      <span class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <svg appToothIcon class="size-6"></svg>
      </span>
      @if (!compact()) {
        <span class="flex flex-col leading-tight">
          <span class="text-xl font-bold tracking-tight text-foreground">Villadent</span>
          <span class="text-xs font-medium text-muted-foreground">AgendaPro</span>
        </span>
      }
    </a>
  `,
})
export class Logo {
  readonly href = input('/');
  readonly compact = input(false);
  /** Extra classes for the link (prototype `className`). */
  readonly extraClass = input('');

  protected linkClass(): string {
    return cn(
      'inline-flex items-center gap-2 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 outline-none',
      this.extraClass(),
    );
  }
}
