import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DailyBreakdown, formatDate, fromDateKey, shortDayName } from '../../../core/domain';
import { REPORT_SERIES } from '../../../core/data/status-styles';
import { cn } from '../../../shared/ui/class-names';

/**
 * Stacked bars of appointments per day and status, drawn with plain flex markup
 * like the prototype (no chart library). Presentational.
 *
 * Each series carries a pattern on top of its colour so the segments stay readable
 * without colour vision (WCAG 1.4.1), and the legend pairs every series with its
 * total for the visible range.
 */
@Component({
  selector: 'section[appReportChart]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-6',
    'aria-labelledby': 'grafico',
  },
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="grafico" class="text-lg font-bold">Citas por día según estado</h2>
      <ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Leyenda">
        @for (item of legend(); track item.status) {
          <li class="flex items-center gap-2">
            <span
              class="size-3 rounded-sm"
              [class]="cn(item.color)"
              [style.background-image]="item.pattern"
              aria-hidden="true"
            ></span>
            <span>{{ item.label }}</span>
            <span class="font-semibold tabular-nums">{{ item.total }}</span>
          </li>
        }
      </ul>
    </div>
    <div class="overflow-x-auto">
      <ol
        class="flex h-64 min-w-full items-end gap-2 border-b pb-px"
        [style.min-width]="minWidth()"
        aria-label="Gráfico de barras"
      >
        @for (bar of bars(); track bar.date) {
          <li class="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span class="text-sm font-semibold tabular-nums" aria-hidden="true">{{ bar.total || '' }}</span>
            <div
              class="flex w-full max-w-12 flex-col-reverse overflow-hidden rounded-t-md"
              [style.height.%]="bar.heightPercent"
              role="img"
              [attr.aria-label]="bar.label"
            >
              @for (segment of bar.segments; track segment.status) {
                <span
                  [class]="cn('w-full', segment.color)"
                  [style.background-image]="segment.pattern"
                  [style.flex]="segment.count"
                ></span>
              }
            </div>
          </li>
        }
      </ol>
      <ol class="flex gap-2 pt-2" [style.min-width]="minWidth()" aria-hidden="true">
        @for (bar of bars(); track bar.date) {
          <li class="flex flex-1 flex-col items-center text-xs leading-tight text-muted-foreground">
            <span class="font-semibold">{{ bar.dayName }}</span>
            <span>{{ bar.dayOfMonth }}</span>
          </li>
        }
      </ol>
    </div>
  `,
})
export class ReportChart {
  readonly days = input.required<readonly DailyBreakdown[]>();

  protected readonly cn = cn;
  protected readonly minWidth = computed(() => `${this.days().length * 3}rem`);

  protected readonly legend = computed(() => {
    const days = this.days();
    return REPORT_SERIES.map((series) => ({
      status: series.status,
      label: series.label,
      color: series.color,
      pattern: series.pattern,
      total: days.reduce((sum, day) => sum + day.counts[series.status], 0),
    }));
  });

  protected readonly bars = computed(() => {
    const days = this.days();
    const max = Math.max(1, ...days.map((d) => d.total));
    return days.map((d) => {
      const date = fromDateKey(d.date);
      const present = REPORT_SERIES.filter((s) => d.counts[s.status]);
      return {
        date: d.date,
        total: d.total,
        heightPercent: (d.total / max) * 100,
        label: `${formatDate(d.date)}: ${d.total} citas. ${present.map((s) => `${s.label}: ${d.counts[s.status]}`).join(', ')}`,
        segments: present.map((s) => ({
          status: s.status,
          color: s.color,
          pattern: s.pattern,
          count: d.counts[s.status],
        })),
        dayName: shortDayName(date),
        dayOfMonth: date.getDate(),
      };
    });
  });
}
