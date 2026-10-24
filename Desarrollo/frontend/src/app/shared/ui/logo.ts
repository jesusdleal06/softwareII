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
      aria-label="Villadent, ir al inicio"
    >
      @if (compact()) {
        <img src="brand/icon-192.png" alt="" width="192" height="192" class="size-10 shrink-0 rounded-full" />
      } @else {
        <!-- The logo's navy and grey text needs a light backdrop: a white plate in dark mode. -->
        <span class="shrink-0 rounded-lg dark:bg-white dark:px-1.5 dark:py-0.5">
          <img src="brand/villadent-logo.png" alt="" width="374" height="160" class="h-10 w-auto" />
        </span>
        <span class="min-w-0 truncate border-l pl-2 text-xs font-medium text-muted-foreground">AgendaPro</span>
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
      'flex min-w-0 items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-ring outline-none',
      this.extraClass(),
    );
  }
}
