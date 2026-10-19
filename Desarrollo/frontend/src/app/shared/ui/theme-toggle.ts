import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { currentTheme, Theme, toggleTheme } from '../browser/theme';

/**
 * Light/dark switch (S15). Icon-only to fit both headers, so the accessible name
 * carries the action instead of the state, and `aria-pressed` exposes the state.
 * The initial value comes from the painted document, which the `index.html`
 * bootstrap has already set from storage before the first paint.
 */
@Component({
  selector: 'app-theme-toggle',
  imports: [LucideMoon, LucideSun],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [attr.aria-label]="label()"
      [attr.aria-pressed]="isDark()"
      [title]="label()"
      (click)="toggle()"
      class="flex size-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      @if (isDark()) {
        <svg lucideSun class="size-5 shrink-0" aria-hidden="true"></svg>
      } @else {
        <svg lucideMoon class="size-5 shrink-0" aria-hidden="true"></svg>
      }
    </button>
  `,
})
export class ThemeToggle {
  private readonly theme = signal<Theme>(currentTheme());
  protected readonly isDark = computed(() => this.theme() === 'dark');
  protected readonly label = computed(() =>
    this.isDark() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
  );

  protected toggle(): void {
    this.theme.set(toggleTheme());
  }
}
