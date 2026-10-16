import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '../../../shared/ui/class-names';

/** Metric card of the reports screen (prototype `Tarjeta`, presentational). */
@Component({
  selector: 'div[appReportCard]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-1 rounded-2xl border bg-card p-5' },
  template: `
    <span class="text-base font-medium text-muted-foreground">{{ heading() }}</span>
    <span [class]="valueClass()">{{ value() }}</span>
    @if (note()) {
      <span class="text-sm text-muted-foreground">{{ note() }}</span>
    }
  `,
})
export class ReportCard {
  readonly heading = input.required<string>();
  readonly value = input.required<number | string>();
  /** Text color class for the value. */
  readonly tone = input.required<string>();
  readonly note = input<string>();

  protected readonly valueClass = computed(() => cn('text-4xl font-bold tabular-nums', this.tone()));
}
