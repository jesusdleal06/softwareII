import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DailyBreakdown, formatDate, fromDateKey, shortDayName } from '../../../core/domain';
import { AppointmentStatus } from '../../../core/models';
import { cn } from '../../../shared/ui/class-names';

/** Chart series in stacking order (bottom to top) with their bar colors. */
export const REPORT_SERIES: readonly { status: AppointmentStatus; color: string }[] = [
  { status: 'Atendida', color: 'bg-success' },
  { status: 'Confirmada', color: 'bg-primary' },
  { status: 'Pendiente', color: 'bg-warning' },
  { status: 'Reprogramada', color: 'bg-accent-foreground/60' },
  { status: 'No asistió', color: 'bg-muted-foreground' },
  { status: 'Cancelada', color: 'bg-destructive' },
];

/**
 * Stacked bars of appointments per day and status, drawn with plain flex markup
 * like the prototype (no chart library). Presentational.
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
        @for (s of series; track s.status) {
          <li class="flex items-center gap-2">
            <span [class]="cn('size-3 rounded-sm', s.color)" aria-hidden="true"></span>
            {{ s.status }}
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
                <span [class]="cn('w-full', segment.color)" [style.flex]="segment.count"></span>
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
  protected readonly series = REPORT_SERIES;
  protected readonly minWidth = computed(() => `${this.days().length * 3}rem`);

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
        label: `${formatDate(d.date)}: ${d.total} citas. ${present.map((s) => `${s.status}: ${d.counts[s.status]}`).join(', ')}`,
        segments: present.map((s) => ({ status: s.status, color: s.color, count: d.counts[s.status] })),
        dayName: shortDayName(date),
        dayOfMonth: date.getDate(),
      };
    });
  });
}
