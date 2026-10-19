import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  applyTheme,
  currentTheme,
  readTheme,
  THEME_COLOR,
  THEME_STORAGE_KEY,
  toggleTheme,
} from './theme';

const ROOT = resolve(process.cwd());
const INDEX_HTML = readFileSync(join(ROOT, 'src/index.html'), 'utf8');

function metaThemeColor(): HTMLMetaElement {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (existing) return existing;
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  document.head.append(meta);
  return meta;
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('starts light without any stored choice', () => {
    expect(THEME_STORAGE_KEY).toBe('villadent-theme');
    expect(readTheme()).toBe('light');
  });

  it('only darkens on an explicit dark choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readTheme()).toBe('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readTheme()).toBe('light');
  });

  it('ignores a stored value that is neither theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readTheme()).toBe('light');
  });

  it('applies and removes the dark class the dark: variants resolve from', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(currentTheme()).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(currentTheme()).toBe('light');
  });

  it('toggles between the two themes and remembers the choice', () => {
    applyTheme('light');
    expect(toggleTheme()).toBe('dark');
    expect(currentTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    expect(toggleTheme()).toBe('light');
    expect(currentTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('keeps the browser chrome colour in step with the applied theme', () => {
    const meta = metaThemeColor();
    applyTheme('dark');
    expect(meta.getAttribute('content')).toBe(THEME_COLOR.dark);
    applyTheme('light');
    expect(meta.getAttribute('content')).toBe(THEME_COLOR.light);
  });

  it('boots from the stored choice and never from the system preference', () => {
    // A dark OS used to flip the app for a visitor who never chose a theme.
    expect(INDEX_HTML).toContain(THEME_STORAGE_KEY);
    expect(INDEX_HTML).not.toContain('prefers-color-scheme');
    // One theme-color so the applied theme, not the OS, decides the browser chrome.
    expect(INDEX_HTML.match(/name="theme-color"/g)).toHaveLength(1);
    expect(metaThemeColor().getAttribute('content')).toBe(THEME_COLOR.light);
  });
});
