/**
 * Theme selection (S2, S15).
 *
 * The app starts light for everyone: the system preference is deliberately NOT
 * followed, because a dark OS used to flip the app for a visitor who never chose
 * a theme. The root `.dark` class is the single source of truth, and `index.html`
 * repeats the storage read inline because it must decide before the first paint,
 * before any module exists. `theme.spec.ts` keeps both readers on the same key.
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'villadent-theme';

/** Browser chrome colour, matching the `--background` token of each theme. */
export const THEME_COLOR: Readonly<Record<Theme, string>> = {
  light: '#ffffff',
  dark: '#0f171c',
};

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Safari in private mode throws on access instead of returning null.
    return null;
  }
}

/** The stored choice; anything that is not `'dark'` means light. */
export function readTheme(store: Storage | null = storage()): Theme {
  try {
    return store?.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** The theme the document is actually painted with. */
export function currentTheme(root?: HTMLElement): Theme {
  const element = root ?? (typeof document === 'undefined' ? null : document.documentElement);
  return element?.classList.contains('dark') ? 'dark' : 'light';
}

/** Paints a theme and syncs the browser chrome; stores nothing. */
export function applyTheme(theme: Theme): Theme {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
  const meta = typeof document === 'undefined' ? null : document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', THEME_COLOR[theme]);
  return theme;
}

/** Paints a theme and remembers the choice. A blocked storage must not break the toggle. */
export function setTheme(theme: Theme, store: Storage | null = storage()): Theme {
  applyTheme(theme);
  try {
    store?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* the theme still applies for this session */
  }
  return theme;
}

export function toggleTheme(): Theme {
  return setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}
