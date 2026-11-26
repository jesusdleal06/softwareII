import { computed, Directive, input } from '@angular/core';
import { cn, mergeClasses } from './class-names';

export type BigButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type BigButtonSize = 'md' | 'lg' | 'xl';

/**
 * Two fills and two exceptions, per S6: a solid primary for the action of the screen
 * and a solid quiet (secondary) fill for everything beside it. `outline` is kept as a
 * name so existing call sites never change behaviour, but it now paints the quiet
 * fill: no button in the app is an outlined button any more (L4 aside, where the
 * boundary belongs to form controls, not to buttons).
 */
const VARIANTS: Record<BigButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border',
  outline: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border',
  ghost: 'bg-transparent text-foreground border-transparent hover:bg-secondary',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent',
  success: 'bg-success text-success-foreground hover:bg-success/90 border-transparent',
};

const SIZES: Record<BigButtonSize, string> = {
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-6 text-base',
  xl: 'min-h-16 px-8 text-base',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors outline-none select-none active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:size-5';

/**
 * Large touch-friendly button styles for `<button>` and `<a>` (prototype `BigButton`/`BigLink`).
 * Extra classes go in the element's own `class` attribute and are merged after the
 * internal ones (conflicting utilities lose, as in the prototype); set `type` explicitly on buttons.
 */
@Directive({
  selector: 'button[appBigButton], a[appBigButton]',
  host: { '[class]': 'classes()' },
})
export class BigButton {
  readonly variant = input<BigButtonVariant>('primary');
  readonly size = input<BigButtonSize>('md');
  readonly full = input(false);
  /** Consumer classes from the element's own `class` attribute; merged, never overwritten. */
  readonly extraClass = input('', { alias: 'class' });

  protected readonly classes = computed(() =>
    mergeClasses(cn(BASE, VARIANTS[this.variant()], SIZES[this.size()], this.full() && 'w-full'), this.extraClass()),
  );
}
