import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Card-on-canvas contract for the public surface (S5/S6 of
 * `odd/tasks/estilo-referencia-tarjetas.md`).
 *
 * The restyle is a rule about which token paints which surface, and jsdom applies no
 * stylesheet, so a page that lost its canvas, a hand-rolled radius or a card whose
 * padding fights the `card` utility would keep every behavioural test green. Like
 * `public-surface.spec.ts` this reads the sources the way `design-tokens.spec.ts`
 * reads the token blocks, so the defect cannot come back unnoticed.
 */

const ROOT = resolve(process.cwd());
const DIR = join(ROOT, 'src/app/features/public');

function sources(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sources(full, found);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) found.push(full);
  }
  return found;
}

/** Strip comments so a prose example never counts as a template rule. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const FILES = sources(DIR).map((file) => ({
  path: file.replace(`${ROOT}/`, ''),
  source: code(readFileSync(file, 'utf8')),
}));

/** Static `class="…"` values of a template (bound `[class]` values are code, not declarations). */
function classAttributes(source: string): string[] {
  return Array.from(source.matchAll(/\sclass="([^"]*)"/g), (match) => match[1]);
}

const PAGES = ['landing-page', 'booking-page', 'appointment-page'] as const;

describe('public surface card-on-canvas contract', () => {
  it('keeps every radius on the S5 scale: xl for cards, md for controls, sm for pills', () => {
    const offScale = /(^|\s)rounded-(lg|2xl|3xl|4xl)(\s|$)/;
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const value of classAttributes(file.source)) {
        for (const className of value.split(/\s+/)) {
          if (offScale.test(className)) offenders.push(`${file.path}: ${className}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('paints the page canvas on every public page shell', () => {
    const offenders = PAGES.filter((page) => {
      const file = FILES.find((candidate) => candidate.path.endsWith(`pages/${page}.ts`));
      if (!file) throw new Error(`missing public page ${page}`);
      return !/<main class="canvas[\s"]/.test(file.source);
    });
    expect(offenders).toEqual([]);
  });

  it('never writes a literal colour in a public template', () => {
    const literal = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\boklch\(|\bhsla?\(/;
    const offenders = FILES.filter((file) => literal.test(file.source)).map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('lets the card utility own the padding, radius, border and background it declares', () => {
    // `card` already carries p-5 sm:p-6, rounded-xl, border-border and bg-card; a second
    // declaration of the same property in the same class attribute is the utilities
    // fighting over one surface, and CSS order (not the template) would decide.
    const owned = /^(?:[a-z-]+:)*(?:p[xytbrl]?|rounded(?:-\w+)?|bg-\w+|border(?:-\w+)?)$/;
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const value of classAttributes(file.source)) {
        const tokens = value.split(/\s+/).filter(Boolean);
        if (!tokens.includes('card')) continue;
        for (const token of tokens) {
          if (token !== 'card' && owned.test(token)) offenders.push(`${file.path}: ${token}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
