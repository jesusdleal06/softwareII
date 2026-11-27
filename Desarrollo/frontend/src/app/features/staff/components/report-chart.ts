import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  VisAxisModule,
  VisCrosshairModule,
  VisStackedBarModule,
  VisTooltipModule,
  VisXYContainerModule,
} from '@unovis/angular';
import { DailyBreakdown, formatDate, fromDateKey, shortDayName } from '../../../core/domain';
import { REPORT_SERIES } from '../../../core/data/status-styles';

/**
 * Stacked bars of appointments per day and status, drawn with Unovis (the engine
 * behind shadcn-vue charts). Presentational.
 *
 * The chart is deliberately sober: solid low-chroma fills, square bars, no
 * animation and no decorative patterns. Values are never tooltip-only: each bar
 * carries its total above it, the legend repeats the range totals in stack order
 * and a toggleable data table repeats every number, so the tooltip is an
 * enhancement rather than the only way to read the chart.
 */
@Component({
  selector: 'section[appReportChart]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'card flex flex-col gap-4',
    'aria-labelledby': 'grafico',
  },
  imports: [
    VisXYContainerModule,
    VisStackedBarModule,
    VisAxisModule,
    VisCrosshairModule,
    VisTooltipModule,
  ],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 id="grafico" class="card-title tracking-tight">Citas por día según estado</h2>
        <p class="text-sm text-muted-foreground">{{ periodLabel() }}</p>
      </div>
      <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
        @for (item of legend(); track item.status) {
          <li class="flex items-center gap-2">
            <svg class="size-2.5 shrink-0" viewBox="0 0 12 12" aria-hidden="true">
              <rect width="12" height="12" rx="2" [style.fill]="item.color"></rect>
            </svg>
            <span>{{ item.label }} <span class="font-semibold text-foreground tabular-nums">{{ item.total }}</span></span>
          </li>
        }
      </ul>
    </div>

    <div role="group" class="tabular-nums" aria-label="Gráfico de barras">
      <vis-xy-container
        [data]="rows()"
        [height]="288"
        ariaLabel="Citas por día según estado"
        [duration]="duration"
        [xDomain]="xDomain()"
        [yDomain]="yDomain()"
        [preventEmptyDomain]="true"
        [margin]="chartMargin"
      >
        <vis-stacked-bar
          [x]="x"
          [y]="yAccessors"
          [color]="colors"
          [barStyle]="barStyle"
          [roundedCorners]="2"
          [barPadding]="0.35"
          [barMaxWidth]="48"
          [duration]="duration"
        />
        <vis-axis
          type="x"
          position="top"
          [gridLine]="false"
          [tickLine]="false"
          [domainLine]="false"
          [tickValues]="xTicks()"
          [tickFormat]="totalTick"
        />
        <vis-axis
          type="x"
          position="bottom"
          [gridLine]="false"
          [tickLine]="false"
          [domainLine]="false"
          [tickValues]="xTicks()"
          [tickFormat]="xTickFormat"
          [tickTextHideOverlapping]="true"
        />
        <vis-axis
          type="y"
          position="left"
          [gridLine]="true"
          [tickLine]="false"
          [domainLine]="false"
          [numTicks]="4"
          [tickFormat]="integerTick"
        />
        <vis-crosshair [x]="x" [yStacked]="yAccessors" [template]="tooltipTemplate" />
        <vis-tooltip />
      </vis-xy-container>
    </div>

    <details>
      <summary class="text-sm font-medium text-muted-foreground">Ver tabla de datos</summary>
      <div class="mt-2 overflow-x-auto">
        <table class="chart-table w-full border-collapse text-left text-sm">
          <caption class="sr-only">
            Citas por día según estado
          </caption>
          <thead>
            <tr class="border-b">
              <th scope="col" class="py-2 pr-4 font-semibold">Día</th>
              @for (series of series; track series.status) {
                <th scope="col" class="py-2 pr-4 text-right font-semibold">{{ series.label }}</th>
              }
              <th scope="col" class="py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.date) {
              <tr class="border-b last:border-0">
                <th scope="row" class="py-2 pr-4 font-normal">{{ formatDate(row.date) }}</th>
                @for (value of row.values; track $index) {
                  <td class="py-2 pr-4 text-right tabular-nums">{{ value }}</td>
                }
                <td class="py-2 text-right font-semibold tabular-nums">{{ row.total }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </details>
  `,
})
export class ReportChart {
  readonly days = input.required<readonly DailyBreakdown[]>();

  protected readonly formatDate = formatDate;
  protected readonly series = REPORT_SERIES;
  protected readonly colors = REPORT_SERIES.map((series) => series.color);
  /** Sober charts never animate, regardless of the motion preference. */
  protected readonly duration = 0;
  protected readonly chartMargin = { top: 24, right: 8, bottom: 24, left: 32 };
  /** Thin separator between stacked segments, drawn in the card background colour. */
  protected readonly barStyle = (): { stroke: string; strokeWidth: number } => ({
    stroke: 'var(--card)',
    strokeWidth: 1,
  });

  protected readonly x = (_row: ChartRow, index: number): number => index;
  protected readonly yAccessors = REPORT_SERIES.map(
    (_series, index) => (row: ChartRow): number => row.values[index],
  );

  protected readonly rows = computed<ChartRow[]>(() =>
    this.days().map((day) => {
      const date = fromDateKey(day.date);
      return {
        date: day.date,
        total: day.total,
        counts: day.counts,
        values: REPORT_SERIES.map((series) => day.counts[series.status]),
        dayName: shortDayName(date),
        dayOfMonth: date.getDate(),
      };
    }),
  );

  protected readonly periodLabel = computed(() => {
    const days = this.days();
    if (!days.length) return '';
    const first = formatDate(days[0].date);
    const last = formatDate(days[days.length - 1].date);
    return first === last ? `Periodo: ${first}` : `Periodo: ${first} al ${last}`;
  });

  protected readonly xDomain = computed<[number, number]>(() => {
    const count = this.days().length;
    return [-0.5, Math.max(0, count - 0.5)];
  });

  /** A little headroom above the tallest bar so its total never crowds the axis. */
  protected readonly yDomain = computed<[number, number]>(() => {
    const peak = this.rows().reduce((max, row) => Math.max(max, row.total), 0);
    return [0, Math.max(1, Math.ceil(peak * 1.15))];
  });

  protected readonly xTicks = computed(() => this.rows().map((_row, index) => index));

  protected readonly legend = computed(() => {
    const days = this.days();
    return REPORT_SERIES.map((series) => ({
      status: series.status,
      label: series.label,
      color: series.color,
      total: days.reduce((sum, day) => sum + day.counts[series.status], 0),
    }));
  });

  protected readonly xTickFormat = (tick: number | Date): string => {
    const row = this.rows()[Number(tick)];
    return row ? `${row.dayName} ${row.dayOfMonth}` : '';
  };

  /** Total of each bar, printed above it by the top axis. */
  protected readonly totalTick = (tick: number | Date): string => {
    const row = this.rows()[Number(tick)];
    return row ? String(row.total) : '';
  };

  protected readonly integerTick = (tick: number | Date): string => String(Math.round(Number(tick)));

  protected readonly tooltipTemplate = (row: ChartRow): string => {
    const present = REPORT_SERIES.filter((series) => row.counts[series.status] > 0);
    const lines = present
      .map(
        (series) =>
          `<div class="flex items-center justify-between gap-4"><span class="flex items-center gap-2"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${series.color}"></span>${series.label}</span><span class="font-semibold tabular-nums">${row.counts[series.status]}</span></div>`,
      )
      .join('');
    return `<div class="flex min-w-40 flex-col gap-1 text-sm"><p class="font-semibold">${formatDate(row.date)}</p>${lines}<div class="mt-1 flex items-center justify-between gap-4 border-t pt-1 text-muted-foreground"><span>Total</span><span class="font-semibold tabular-nums">${row.total}</span></div></div>`;
  };
}

interface ChartRow {
  date: string;
  total: number;
  counts: DailyBreakdown['counts'];
  values: number[];
  dayName: string;
  dayOfMonth: number;
}
