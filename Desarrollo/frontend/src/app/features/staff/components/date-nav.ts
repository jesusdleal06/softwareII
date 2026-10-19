import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { addDays, formatDate, formatLongDate, fromDateKey, toDateKey } from '../../../core/domain';
import { cn } from '../../../shared/ui/class-names';

const ICON_BUTTON =
  'flex size-12 items-center justify-center rounded-xl border bg-card hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Previous / today / next day navigation with the long date (presentational). */
@Component({
  selector: 'app-date-nav',
  imports: [LucideChevronLeft, LucideChevronRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center gap-3' },
  template: `
    <div class="flex items-center gap-2">
      <button type="button" (click)="move(-1)" aria-label="Día anterior" class="${ICON_BUTTON}">
        <svg lucideChevronLeft class="size-6"></svg>
      </button>
      <button type="button" (click)="dateChange.emit(today())" [class]="todayClass()">Hoy</button>
      <button type="button" (click)="move(1)" aria-label="Día siguiente" class="${ICON_BUTTON}">
        <svg lucideChevronRight class="size-6"></svg>
      </button>
    </div>
    <div class="flex flex-col leading-tight">
      <span class="text-xl font-bold first-letter:uppercase">{{ longDate() }}</span>
      <span class="text-sm text-muted-foreground">{{ shortDate() }}</span>
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
      'min-h-12 rounded-xl border px-4 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
      this.date() === this.today() ? 'border-primary bg-accent text-accent-foreground' : 'bg-card hover:bg-muted',
    ),
  );

  protected move(days: number): void {
    this.dateChange.emit(toDateKey(addDays(fromDateKey(this.date()), days)));
  }
}
