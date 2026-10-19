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
  /**
   * CSS `background-image` drawn over `series` so segments stay distinguishable
   * without colour (WCAG 1.4.1). `null` means the series is the solid one. This is a
   * data encoding, not decoration: do not remove it as "unnecessary texture".
   */
  readonly seriesPattern: string | null;
}

const INK = 'var(--chart-pattern-ink)';

function stripes(angle: number, weight = 3): string {
  return `repeating-linear-gradient(${angle}deg, transparent 0 ${weight}px, ${INK} ${weight}px ${weight * 2}px)`;
}

const STYLES: Record<AppointmentStatus, StatusStyle> = {
  Pendiente: {
    label: 'Pendiente',
    order: 0,
    badge: 'bg-warning/20 text-warning-foreground border-warning/40',
    block: 'bg-warning/15 border-warning text-foreground',
    series: 'bg-warning',
    seriesPattern: stripes(135),
  },
  Confirmada: {
    label: 'Confirmada',
    order: 1,
    badge: 'bg-primary/10 text-primary border-primary/30',
    block: 'bg-primary/10 border-primary text-foreground',
    series: 'bg-primary',
    seriesPattern: stripes(45),
  },
  Reprogramada: {
    label: 'Reprogramada',
    order: 2,
    badge: 'bg-accent text-accent-foreground border-primary/20',
    block: 'bg-accent border-accent-foreground/50 text-foreground',
    series: 'bg-accent-foreground',
    seriesPattern: stripes(0),
  },
  Atendida: {
    label: 'Atendida',
    order: 3,
    badge: 'bg-success/15 text-success border-success/30',
    block: 'bg-success/10 border-success text-foreground',
    series: 'bg-success',
    seriesPattern: null,
  },
  'No asistió': {
    label: 'No asistió',
    order: 4,
    badge: 'bg-muted text-muted-foreground border-border',
    block: 'bg-muted border-muted-foreground/60 text-muted-foreground',
    series: 'bg-muted-foreground',
    seriesPattern: stripes(90),
  },
  Cancelada: {
    label: 'Cancelada',
    order: 5,
    badge: 'bg-destructive/10 text-destructive border-destructive/30',
    block: 'bg-destructive/5 border-destructive/60 text-muted-foreground line-through',
    series: 'bg-destructive',
    seriesPattern: `${stripes(45, 2)}, ${stripes(135, 2)}`,
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
  pattern: string | null;
}[] = STATUS_ORDER.map((status) => ({
  status,
  label: STYLES[status].label,
  color: STYLES[status].series,
  pattern: STYLES[status].seriesPattern,
}));
