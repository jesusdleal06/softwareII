import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { addDays, formatDate, formatLongDate, fromDateKey, toDateKey } from '../../../core/domain';
import { cn } from '../../../shared/ui/class-names';

const ICON_BUTTON =
  'flex size-10 shrink-0 items-center justify-center rounded-md border border-transparent bg-secondary text-secondary-foreground outline-none transition-colors select-none hover:bg-secondary/80 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';

/** Previous / today / next day navigation with the long date (presentational). */
@Component({
  selector: 'app-date-nav',
  imports: [LucideChevronLeft, LucideChevronRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center gap-3' },
  template: `
    <div class="flex items-center gap-2">
      <button type="button" (click)="move(-1)" aria-label="Día anterior" class="${ICON_BUTTON}">
        <svg lucideChevronLeft class="size-4"></svg>
      </button>
      <button type="button" (click)="dateChange.emit(today())" [class]="todayClass()">Hoy</button>
      <button type="button" (click)="move(1)" aria-label="Día siguiente" class="${ICON_BUTTON}">
        <svg lucideChevronRight class="size-4"></svg>
      </button>
    </div>
    <div class="flex flex-col leading-tight">
      <span class="text-sm font-semibold text-foreground first-letter:uppercase tabular-nums">{{ longDate() }}</span>
      <span class="text-xs text-muted-foreground tabular-nums">{{ shortDate() }}</span>
    </div>
  `,
})
export class DateNav {
  /** Selected day `yyyy-mm-dd`. */
  readonly date = input.required<string>();
  /** Today's key, from the app clock. */
  readonly today = input.required<string>();
  readonly dateChange = output<string>();

  protected readonly longDate = computed(() => formatLongDate(this.date()));
  protected readonly shortDate = computed(() => formatDate(this.date()));
  protected readonly todayClass = computed(() =>
    cn(
      'inline-flex h-10 shrink-0 items-center justify-center rounded-md border px-3 text-sm font-medium outline-none transition-colors select-none active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      this.date() === this.today()
        ? 'border-primary bg-accent text-accent-foreground'
        : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ),
  );

  protected move(days: number): void {
    this.dateChange.emit(toDateKey(addDays(fromDateKey(this.date()), days)));
  }
}
