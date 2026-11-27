import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cn } from './class-names';

/**
 * Clinic logo linking home. The images live in `public/brand/` (generated from the
 * originals in `Documentacion/marca/`). They are decorative (`alt=""`) because the link's
 * aria-label already names it.
 */
@Component({
  selector: 'app-logo',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `min-w-0` lets the host shrink below its content width; without it the
  // product name's `truncate` never takes effect and a narrow header overflows.
  host: { class: 'min-w-0' },
  template: `
    <a
      [routerLink]="href()"
      [class]="linkClass()"
      aria-label="Villadent AgendaPro, ir al inicio"
    >
      @if (compact()) {
        <img src="brand/icon-192.png" alt="" width="192" height="192" class="size-10 shrink-0 rounded-full" />
      } @else {
        <!-- Two assets, one per theme: the header swaps to the logo drawn for the dark
             ground instead of putting a white plate behind the light one. -->
        <img
          src="brand/villadent-logo.png"
          alt=""
          width="371"
          height="160"
          class="h-10 w-auto shrink-0 dark:hidden"
        />
        <img
          src="brand/villadent-logo-dark.png"
          alt=""
          width="377"
          height="160"
          class="hidden h-10 w-auto shrink-0 dark:block"
        />
        <!-- Hidden on phones: the logo already identifies the site and the controls need the room. -->
        <span class="hidden min-w-0 truncate border-l border-border pl-2 text-xs font-medium text-muted-foreground sm:block">AgendaPro</span>
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
      'flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      this.extraClass(),
    );
  }
}
