import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { REPORT_SERIES, STATUS_ORDER, STATUS_STYLES } from './status-styles';

/**
 * Design token contract.
 *
 * The contrast defects found in the UI audit were invisible to every other test:
 * they live in token values, not in behavior. This spec measures the real
 * `styles.css` values with the WCAG 2.x formula so an insufficient contrast or an
 * incomplete dark theme fails the suite instead of shipping.
 *
 * Method: oklch -> oklab -> linear sRGB -> gamma sRGB, then relative luminance.
 * Alpha compositing happens in gamma sRGB, which is the space the browser uses for
 * these colours.
 */

const ROOT = resolve(process.cwd());
const STYLES = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');

type Srgb = readonly [number, number, number];

function oklchToSrgb(l: number, c: number, h: number): Srgb {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const lmsL = l + 0.3963377774 * a + 0.2158037573 * b;
  const lmsM = l - 0.1055613458 * a - 0.0638541728 * b;
  const lmsS = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = lmsL ** 3;
  const m3 = lmsM ** 3;
  const s3 = lmsS ** 3;
  const linear: Srgb = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  return linear.map((channel) => {
    const x = Math.min(1, Math.max(0, channel));
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  }) as unknown as Srgb;
}

function parseOklch(value: string): Srgb | null {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value.trim());
  if (!match) return null;
  return oklchToSrgb(Number(match[1]), Number(match[2]), Number(match[3]));
}

function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(STYLES);
  if (!match) return {};
  const tokens: Record<string, string> = {};
  // Comments may sit between declarations; drop them so a documented token is not skipped.
  for (const line of match[1].replace(/\/\*[\s\S]*?\*\//g, '').split(';')) {
    const [name, ...rest] = line.split(':');
    if (!name?.trim().startsWith('--')) continue;
    tokens[name.trim()] = rest.join(':').trim();
  }
  return tokens;
}

const light = block(':root');
const dark = block('.dark');

function rgb(tokens: Record<string, string>, name: string): Srgb {
  const value = tokens[name.startsWith('--') ? name : `--${name}`];
  if (!value) throw new Error(`token ${name} is not defined`);
  const parsed = parseOklch(value);
  if (!parsed) throw new Error(`token ${name} is not an oklch colour: ${value}`);
  return parsed;
}

function composite(alpha: number, fg: Srgb, bg: Srgb): Srgb {
  return fg.map((channel, index) => alpha * channel + (1 - alpha) * bg[index]) as unknown as Srgb;
}

function tint(tokens: Record<string, string>, name: string, alpha: number, base: Srgb): Srgb {
  return composite(alpha, rgb(tokens, name), base);
}

function luminance(color: Srgb): number {
  const [r, g, b] = color.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: Srgb, bg: Srgb): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

interface Pair {
  readonly label: string;
  readonly fg: (tokens: Record<string, string>) => Srgb;
  readonly bg: (tokens: Record<string, string>) => Srgb;
  readonly min: number;
}

const TEXT = 4.5;
const NON_TEXT = 3;

function solid(name: string) {
  return (tokens: Record<string, string>) => rgb(tokens, name);
}

function overTint(name: string, alpha: number, base: 'background' | 'card') {
  return (tokens: Record<string, string>) => tint(tokens, name, alpha, rgb(tokens, base));
}

const LIGHT_PAIRS: readonly Pair[] = [
  // Measured before the fix: 3.53:1 (placeholder/70) and 3.75:1 (success on tint).
  { label: 'foreground on background', fg: solid('foreground'), bg: solid('background'), min: TEXT },
  { label: 'card-foreground on card', fg: solid('card-foreground'), bg: solid('card'), min: TEXT },
  { label: 'muted-foreground on background', fg: solid('muted-foreground'), bg: solid('background'), min: TEXT },
  { label: 'muted-foreground on muted', fg: solid('muted-foreground'), bg: solid('muted'), min: TEXT },
  { label: 'placeholder-foreground on background', fg: solid('placeholder-foreground'), bg: solid('background'), min: TEXT },
  { label: 'secondary-foreground on secondary', fg: solid('secondary-foreground'), bg: solid('secondary'), min: TEXT },
  { label: 'accent-foreground on accent', fg: solid('accent-foreground'), bg: solid('accent'), min: TEXT },
  { label: 'primary-foreground on primary', fg: solid('primary-foreground'), bg: solid('primary'), min: TEXT },
  { label: 'primary on background', fg: solid('primary'), bg: solid('background'), min: TEXT },
  // Badge "Confirmada": measured 4.51:1 before the fix, the thinnest margin in the system.
  { label: 'primary on primary/10', fg: solid('primary'), bg: overTint('primary', 0.1, 'background'), min: TEXT },
  { label: 'success-foreground on success', fg: solid('success-foreground'), bg: solid('success'), min: TEXT },
  { label: 'success on background', fg: solid('success'), bg: solid('background'), min: TEXT },
  // Badge "Atendida": measured 3.75:1 before the fix.
  { label: 'success on success/15', fg: solid('success'), bg: overTint('success', 0.15, 'background'), min: TEXT },
  { label: 'destructive-foreground on destructive', fg: solid('destructive-foreground'), bg: solid('destructive'), min: TEXT },
  { label: 'destructive on background', fg: solid('destructive'), bg: solid('background'), min: TEXT },
  { label: 'destructive on destructive/10', fg: solid('destructive'), bg: overTint('destructive', 0.1, 'background'), min: TEXT },
  { label: 'warning-foreground on warning/20', fg: solid('warning-foreground'), bg: overTint('warning', 0.2, 'background'), min: TEXT },
  // WhatsApp avatar: white on whatsapp measured 3.01:1 before the fix.
  { label: 'whatsapp-foreground on whatsapp', fg: solid('whatsapp-foreground'), bg: solid('whatsapp'), min: TEXT },
  { label: 'input border on background', fg: solid('input'), bg: solid('background'), min: NON_TEXT },
  { label: 'focus ring on background', fg: solid('ring'), bg: solid('background'), min: NON_TEXT },
  // Report chart segments are meaningful non-text graphics (WCAG 1.4.11): each solid
  // fill must reach 3:1 against the card background.
  { label: 'chart Atendida on card', fg: solid('chart-atendida'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart Confirmada on card', fg: solid('chart-confirmada'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart Pendiente on card', fg: solid('chart-pendiente'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart Reprogramada on card', fg: solid('chart-reprogramada'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart Cancelada on card', fg: solid('chart-cancelada'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart No asistió on card', fg: solid('chart-no-asistio'), bg: solid('card'), min: NON_TEXT },
];

const DARK_PAIRS: readonly Pair[] = [
  { label: 'foreground on background', fg: solid('foreground'), bg: solid('background'), min: TEXT },
  { label: 'card-foreground on card', fg: solid('card-foreground'), bg: solid('card'), min: TEXT },
  { label: 'muted-foreground on background', fg: solid('muted-foreground'), bg: solid('background'), min: TEXT },
  { label: 'muted-foreground on muted', fg: solid('muted-foreground'), bg: solid('muted'), min: TEXT },
  { label: 'placeholder-foreground on card', fg: solid('placeholder-foreground'), bg: solid('card'), min: TEXT },
  { label: 'secondary-foreground on secondary', fg: solid('secondary-foreground'), bg: solid('secondary'), min: TEXT },
  { label: 'accent-foreground on accent', fg: solid('accent-foreground'), bg: solid('accent'), min: TEXT },
  { label: 'primary-foreground on primary', fg: solid('primary-foreground'), bg: solid('primary'), min: TEXT },
  { label: 'primary on background', fg: solid('primary'), bg: solid('background'), min: TEXT },
  { label: 'primary on primary/20', fg: solid('primary'), bg: overTint('primary', 0.2, 'card'), min: TEXT },
  { label: 'success-foreground on success', fg: solid('success-foreground'), bg: solid('success'), min: TEXT },
  { label: 'success on success/20', fg: solid('success'), bg: overTint('success', 0.2, 'card'), min: TEXT },
  { label: 'destructive-foreground on destructive', fg: solid('destructive-foreground'), bg: solid('destructive'), min: TEXT },
  // `destructive/20` over the dark card measured 4.43:1; the dark ceiling for this tint is /15.
  { label: 'destructive on destructive/15', fg: solid('destructive'), bg: overTint('destructive', 0.15, 'card'), min: TEXT },
  { label: 'warning-foreground on warning', fg: solid('warning-foreground'), bg: solid('warning'), min: TEXT },
  { label: 'whatsapp-foreground on whatsapp', fg: solid('whatsapp-foreground'), bg: solid('whatsapp'), min: TEXT },
  { label: 'input border on card', fg: solid('input'), bg: solid('card'), min: NON_TEXT },
  { label: 'focus ring on background', fg: solid('ring'), bg: solid('background'), min: NON_TEXT },
  // Report chart segments are meaningful non-text graphics (WCAG 1.4.11): each solid
  // fill must reach 3:1 against the card background.
  { label: 'chart Atendida on card', fg: solid('chart-atendida'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart Confirmada on card', fg: solid('chart-confirmada'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart Pendiente on card', fg: solid('chart-pendiente'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart Reprogramada on card', fg: solid('chart-reprogramada'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart Cancelada on card', fg: solid('chart-cancelada'), bg: solid('card'), min: NON_TEXT },
  { label: 'chart No asistió on card', fg: solid('chart-no-asistio'), bg: solid('card'), min: NON_TEXT },
];

function themeTokens(): string[] {
  const match = /@theme inline\s*\{([^}]*)\}/.exec(STYLES);
  const names = [...(match?.[1] ?? '').matchAll(/var\((--[a-z0-9-]+)\)/g)].map((entry) => entry[1]);
  return [...new Set(names)];
}

describe('design token contract (WCAG 2.x measured)', () => {
  it('defines every theme token with an oklch colour in :root', () => {
    const missing = themeTokens().filter((name) => !light[name]);
    expect(missing).toEqual([]);
  });

  it('redefines every colour token inside .dark', () => {
    // An incomplete dark block is what let `dark:` utilities resolve to light values.
    // Only colour tokens belong here: lengths such as `--radius` are theme-independent.
    const missing = themeTokens().filter((name) => light[name] && parseOklch(light[name]) && !dark[name]);
    expect(missing).toEqual([]);
  });

  it('pins color-scheme to each theme', () => {
    expect(STYLES).toMatch(/:root\s*\{[^}]*color-scheme:\s*light/);
    expect(STYLES).toMatch(/\.dark\s*\{[^}]*color-scheme:\s*dark/);
  });

  it('honours prefers-reduced-motion', () => {
    expect(STYLES).toContain('@media (prefers-reduced-motion: reduce)');
  });

  describe('appointment status badges', () => {
    it.each([
      { theme: 'light', tokens: light },
      { theme: 'dark', tokens: dark },
    ])('keeps Pendiente text at 4.5:1 on the composited $theme card', ({ theme, tokens }) => {
      const classes = STATUS_STYLES.Pendiente.badge.split(/\s+/);
      const background = classes.find((name) => name.startsWith('bg-'));
      const foreground =
        (theme === 'dark' && classes.find((name) => name.startsWith('dark:text-')))
        || classes.find((name) => name.startsWith('text-'));
      const fill = /^bg-([\w-]+)\/(\d+)$/.exec(background ?? '');
      const ink = /^(?:dark:)?text-([\w-]+)$/.exec(foreground ?? '');
      if (!fill || !ink) throw new Error(`Cannot measure badge classes: ${classes.join(' ')}`);

      const effectiveFill = tint(tokens, fill[1], Number(fill[2]) / 100, rgb(tokens, 'card'));
      const ratio = contrast(rgb(tokens, ink[1]), effectiveFill);
      expect(ratio, `${theme} Pendiente contrast over card: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(TEXT);
    });

    it('preserves the six labels, agenda blocks, report colours and non-Pending badges', () => {
      expect(STATUS_ORDER).toEqual(['Pendiente', 'Confirmada', 'Reprogramada', 'Atendida', 'No asistió', 'Cancelada']);
      expect(STATUS_ORDER.map((status) => STATUS_STYLES[status].label)).toEqual(STATUS_ORDER);
      expect(STATUS_ORDER.map((status) => STATUS_STYLES[status].block)).toEqual([
        'bg-warning/15 border-warning text-foreground',
        'bg-primary/10 border-primary text-foreground',
        'bg-accent border-accent-foreground/50 text-foreground',
        'bg-success/10 border-success text-foreground',
        'bg-muted border-muted-foreground/60 text-muted-foreground',
        'bg-destructive/5 border-destructive/60 text-muted-foreground line-through',
      ]);
      // Pending statuses ride taste's neutral ramp and the outcomes keep its semantic
      // hues, so the bars stay distinguishable on the monochrome card. Each colour is
      // the `--chart-<status>` token measured by the contrast pairs above.
      expect(REPORT_SERIES.map(({ color }) => color)).toEqual([
        'var(--chart-pendiente)',
        'var(--chart-confirmada)',
        'var(--chart-reprogramada)',
        'var(--chart-atendida)',
        'var(--chart-no-asistio)',
        'var(--chart-cancelada)',
      ]);
      expect(STATUS_ORDER.slice(1).map((status) => STATUS_STYLES[status].badge)).toEqual([
        'bg-primary/10 text-primary border-primary/30',
        'bg-accent text-accent-foreground border-primary/20',
        'bg-success/15 text-success border-success/30',
        'bg-muted text-muted-foreground border-border',
        'bg-destructive/10 text-destructive border-destructive/30',
      ]);
    });
  });

  describe('light theme contrast', () => {
    for (const pair of LIGHT_PAIRS) {
      it(`${pair.label} >= ${pair.min}:1`, () => {
        expect(contrast(pair.fg(light), pair.bg(light))).toBeGreaterThanOrEqual(pair.min);
      });
    }
  });

  describe('dark theme contrast', () => {
    for (const pair of DARK_PAIRS) {
      it(`${pair.label} >= ${pair.min}:1`, () => {
        expect(contrast(pair.fg(dark), pair.bg(dark))).toBeGreaterThanOrEqual(pair.min);
      });
    }
  });
});
