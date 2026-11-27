import { AppointmentStatus } from '../models';

/**
 * Single source of truth for appointment status.
 *
 * The UI audit found two divergent maps (badges vs. the report chart) that gave the
 * same status a different colour, order and shape depending on the screen, and one
 * place that printed the raw enum value. Everything that renders a status reads from
 * here: the badge, the agenda block, the agenda legend and the chart series.
 */
export interface StatusStyle {
  /** Visible Spanish copy. Never render the enum value directly. */
  readonly label: string;
  /** Canonical order, used by every legend and by the chart's stacking order. */
  readonly order: number;
  readonly badge: string;
  readonly block: string;
  /** Solid colour for the chart bar and its legend swatch. */
  readonly series: string;
}

const STYLES: Record<AppointmentStatus, StatusStyle> = {
  Pendiente: {
    label: 'Pendiente',
    order: 0,
    badge: 'bg-warning/20 text-warning-foreground dark:text-warning border-warning/40',
    block: 'bg-warning/15 border-warning text-foreground',
    series: 'var(--chart-pendiente)',
  },
  Confirmada: {
    label: 'Confirmada',
    order: 1,
    badge: 'bg-primary/10 text-primary border-primary/30',
    block: 'bg-primary/10 border-primary text-foreground',
    series: 'var(--chart-confirmada)',
  },
  Reprogramada: {
    label: 'Reprogramada',
    order: 2,
    badge: 'bg-accent text-accent-foreground border-primary/20',
    block: 'bg-accent border-accent-foreground/50 text-foreground',
    series: 'var(--chart-reprogramada)',
  },
  Atendida: {
    label: 'Atendida',
    order: 3,
    badge: 'bg-success/15 text-success border-success/30',
    block: 'bg-success/10 border-success text-foreground',
    series: 'var(--chart-atendida)',
  },
  'No asistió': {
    label: 'No asistió',
    order: 4,
    badge: 'bg-muted text-muted-foreground border-border',
    block: 'bg-muted border-muted-foreground/60 text-muted-foreground',
    series: 'var(--chart-no-asistio)',
  },
  Cancelada: {
    label: 'Cancelada',
    order: 5,
    badge: 'bg-destructive/10 text-destructive border-destructive/30',
    block: 'bg-destructive/5 border-destructive/60 text-muted-foreground line-through',
    series: 'var(--chart-cancelada)',
  },
};

export const STATUS_STYLES = STYLES;

/** Canonical workflow order shared by every legend and by the chart. */
export const STATUS_ORDER: readonly AppointmentStatus[] = (
  Object.keys(STYLES) as AppointmentStatus[]
).sort((a, b) => STYLES[a].order - STYLES[b].order);

/** Chart series in stacking order (bottom to top), derived from the canonical order. */
export const REPORT_SERIES: readonly {
  status: AppointmentStatus;
  label: string;
  color: string;
}[] = STATUS_ORDER.map((status) => ({
  status,
  label: STYLES[status].label,
  color: STYLES[status].series,
}));

/**
 * Single-hue palette for the report bars only: badges keep the semantic colours
 * above, while the chart reads the monochrome ramp in `styles.css`. Labels and
 * order mirror REPORT_SERIES so legends and tables stay aligned.
 */
const CHART_SERIES_COLORS: Record<AppointmentStatus, string> = {
  Pendiente: 'var(--chart-series-1)',
  Confirmada: 'var(--chart-series-2)',
  Reprogramada: 'var(--chart-series-3)',
  Atendida: 'var(--chart-series-4)',
  'No asistió': 'var(--chart-series-5)',
  Cancelada: 'var(--chart-series-6)',
};

export const REPORT_CHART_SERIES: readonly {
  status: AppointmentStatus;
  label: string;
  color: string;
}[] = STATUS_ORDER.map((status) => ({
  status,
  label: STYLES[status].label,
  color: CHART_SERIES_COLORS[status],
}));
