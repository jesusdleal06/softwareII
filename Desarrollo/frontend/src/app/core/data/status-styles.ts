import { AppointmentStatus } from '../models';

/** Tailwind classes per status: `badge` for pills, `block` for agenda blocks. */
export const STATUS_STYLES: Record<AppointmentStatus, { badge: string; block: string }> = {
  Pendiente: {
    badge: 'bg-warning/20 text-warning-foreground border-warning/40',
    block: 'bg-warning/15 border-warning text-foreground',
  },
  Confirmada: {
    badge: 'bg-primary/10 text-primary border-primary/30',
    block: 'bg-primary/10 border-primary text-foreground',
  },
  Reprogramada: {
    badge: 'bg-accent text-accent-foreground border-primary/20',
    block: 'bg-accent border-accent-foreground/50 text-foreground',
  },
  Cancelada: {
    badge: 'bg-destructive/10 text-destructive border-destructive/30',
    block: 'bg-destructive/5 border-destructive/60 text-muted-foreground line-through',
  },
  Atendida: {
    badge: 'bg-success/15 text-success border-success/30',
    block: 'bg-success/10 border-success text-foreground',
  },
  'No asistió': {
    badge: 'bg-muted text-muted-foreground border-border',
    block: 'bg-muted border-muted-foreground/60 text-muted-foreground',
  },
};
