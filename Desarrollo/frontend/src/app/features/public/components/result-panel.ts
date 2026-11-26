import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Outcome screen with a tinted icon tile, title and text (prototype `Resultado`). Icon via `[icon]` slot. */
@Component({
  selector: 'app-result-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <!-- A terminal state is one group on the canvas; the card the host projects (the
         appointment summary) stays a sibling, never a card inside a card. -->
    <div class="card flex flex-col items-center gap-4 text-center">
      <span
        [class]="
          tone() === 'success'
            ? 'flex size-16 items-center justify-center rounded-xl bg-success/15 text-success dark:bg-success/20'
            : 'flex size-16 items-center justify-center rounded-xl bg-muted text-muted-foreground'
        "
        aria-hidden="true"
      >
        <ng-content select="[icon]" />
      </span>
      <div class="flex flex-col gap-1">
        <h1 class="page-title text-balance">{{ heading() }}</h1>
        <p class="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">{{ text() }}</p>
      </div>
    </div>
    <ng-content />
  `,
})
export class ResultPanel {
  readonly tone = input.required<'success' | 'muted'>();
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
}
