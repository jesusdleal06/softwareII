import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';
import { cn } from './class-names';

const WIDTHS = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' } as const;

/** Monotonic counter so two open modals never share `aria-labelledby`/`aria-describedby` ids. */
let nextModalId = 0;

/** Smoothly scrolls the open modal's body to the top. */
export function scrollModalToTop(): void {
  const body = document.querySelector('dialog[open] [data-modal-scroll]');
  // jsdom (unit tests) does not implement Element.scrollTo.
  if (body && typeof body.scrollTo === 'function') body.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Accessible modal built on the native `<dialog>` (focus trap, Esc and backdrop close),
 * as in the prototype. `layout="side"` renders a right-hand panel.
 */
@Component({
  selector: 'app-modal',
  imports: [LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="description() ? descriptionId : null"
      [class]="dialogClass()"
      (close)="onNativeClose()"
      (cancel)="onCancel($event)"
      (click)="onBackdropClick($event)"
    >
      @if (open()) {
        <div #backdrop [class]="wrapperClass()">
          <div [class]="panelClass()" role="document">
            <header class="flex items-start justify-between gap-4 border-b px-6 py-5">
              <div class="flex flex-col gap-1">
                <h2 [id]="titleId" class="text-xl font-bold text-balance">{{ title() }}</h2>
                @if (description()) {
                  <p [id]="descriptionId" class="text-base text-muted-foreground text-pretty">{{ description() }}</p>
                }
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                class="flex size-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none"
                (click)="closed.emit()"
              >
                <svg lucideX class="size-6"></svg>
              </button>
            </header>
            <div data-modal-scroll class="flex-1 overflow-y-auto px-6 py-5">
              <ng-content />
            </div>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class Modal {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly layout = input<'center' | 'side'>('center');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Emitted when the user asks to close (close button, Esc or backdrop). */
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly backdrop = viewChild<ElementRef<HTMLDivElement>>('backdrop');

  /** Per-instance ids: a second open modal must not steal the first one's labels. */
  private readonly instanceId = nextModalId++;
  protected readonly titleId = `modal-title-${this.instanceId}`;
  protected readonly descriptionId = `modal-desc-${this.instanceId}`;

  protected readonly dialogClass = computed(() =>
    cn(
      'm-0 max-h-none max-w-none bg-transparent p-0 text-foreground backdrop:bg-foreground/40 backdrop:backdrop-blur-[2px]',
      'fixed inset-0 h-dvh w-dvw',
    ),
  );

  protected readonly wrapperClass = computed(() =>
    cn(
      'flex h-full w-full',
      this.layout() === 'center' && 'items-end justify-center sm:items-center sm:p-6',
      this.layout() === 'side' && 'justify-end',
    ),
  );

  protected readonly panelClass = computed(() =>
    cn(
      'flex w-full flex-col bg-card shadow-xl',
      this.layout() === 'center' && cn('max-h-[92dvh] rounded-t-2xl sm:rounded-2xl', WIDTHS[this.size()]),
      this.layout() === 'side' && 'h-full max-w-xl sm:border-l',
    ),
  );

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      const open = this.open();
      if (open && !el.open) {
        // jsdom (unit tests) has no showModal(); fall back to the `open` attribute.
        if (typeof el.showModal === 'function') el.showModal();
        else el.setAttribute('open', '');
      }
      if (!open && el.open) {
        if (typeof el.close === 'function') el.close();
        else el.removeAttribute('open');
      }
    });

    effect((onCleanup) => {
      if (!this.open()) return;
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      onCleanup(() => (document.body.style.overflow = previous));
    });
  }

  protected onCancel(event: Event): void {
    // Esc: let the parent decide (it controls `open`).
    event.preventDefault();
    this.closed.emit();
  }

  protected onNativeClose(): void {
    if (this.open()) this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    // The wrapper covers the whole dialog, so clicks on the backdrop land on it
    // and `target === dialog` never fires; compare against the wrapper instead.
    // Clicks inside the panel bubble up with a deeper target and stay open.
    const target = event.target as Node | null;
    if (target === this.dialog().nativeElement || target === this.backdrop()?.nativeElement) {
      this.closed.emit();
    }
  }
}
