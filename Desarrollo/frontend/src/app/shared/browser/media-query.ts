import { DestroyRef, inject, Signal, signal } from '@angular/core';

/**
 * Signal that tracks a CSS media query (prototype `useMediaQuery`). Must run in an
 * injection context; the listener is removed on destroy. Without `matchMedia`
 * (SSR, jsdom) it stays `false`, like the prototype's server snapshot.
 */
export function mediaQuery(query: string): Signal<boolean> {
  const destroyRef = inject(DestroyRef);
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return signal(false).asReadonly();
  }
  const mql = window.matchMedia(query);
  const matches = signal(mql.matches);
  const onChange = (event: MediaQueryListEvent) => matches.set(event.matches);
  mql.addEventListener('change', onChange);
  destroyRef.onDestroy(() => mql.removeEventListener('change', onChange));
  return matches.asReadonly();
}
