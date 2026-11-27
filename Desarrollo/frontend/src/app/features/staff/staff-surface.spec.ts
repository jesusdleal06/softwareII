import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Surface contract for the staff panel (S4, S5, S6, S7 of
 * `odd/tasks/estilo-referencia-tarjetas.md`, and taste's system for the `Operate`
 * mode the preferences of S12 assign to the panel).
 *
 * The restyle is a rule about which token paints which surface, and jsdom applies no
 * stylesheet: a card that silently lost its radius, a block that grew a shadow next to
 * its border, or a page title re-spelled inline would keep every behavioural test
 * green. This spec reads the staff sources the way `surface-contract.spec.ts` reads
 * the shared layer, so the vocabulary cannot drift away from the contract.
 */

const ROOT = resolve(process.cwd());
const DIR = join(ROOT, 'src/app/features/staff');

function sources(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sources(full, found);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) found.push(full);
  }
  return found;
}

const FILES = sources(DIR).map((file) => ({
  path: file.replace(`${ROOT}/`, ''),
  source: readFileSync(file, 'utf8'),
}));

/** Strip comments so prose (dashes, `#`, developer notes) never counts as markup. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function offenders(pattern: RegExp): string[] {
  return FILES.filter((file) => pattern.test(code(file.source))).map((file) => file.path);
}

function file(path: string): string {
  return code(FILES.find((entry) => entry.path.endsWith(path))?.source ?? '');
}

describe('staff surface contract', () => {
  it('never writes a literal colour: every surface comes from a token', () => {
    expect(offenders(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\boklch\(|\bhsla?\(/)).toEqual([]);
  });

  it('declares elevation once, with the card border and never a shadow', () => {
    expect(offenders(/\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl)\b|transition-shadow/)).toEqual([]);
  });

  it('uses only the three radii of the contract: sm, md and xl (circles aside)', () => {
    expect(offenders(/\brounded-(?:lg|2xl|3xl|4xl)\b/)).toEqual([]);
  });

  it('renders every staff page title from the shared page-title recipe', () => {
    expect(offenders(/text-2xl font-bold/)).toEqual([]);
    for (const page of ['pages/agenda-page.ts', 'pages/my-agenda-page.ts', 'pages/reports-page.ts']) {
      const file = FILES.find((f) => f.path.endsWith(page));
      expect(code(file?.source ?? '')).toContain('page-title');
    }
  });

  it('keeps the field boundary at full strength: no consumer cancels it', () => {
    expect(offenders(/inputClass="[^"]*\bborder-(?:0|none|transparent)\b/)).toEqual([]);
  });

  /*
   * taste's system in the `Operate` mode (S12): one hairline, one radius family,
   * labels at 13/500 and never tracked capitals, the current section carried by the
   * ink. These are class assertions only; the behaviour is covered elsewhere.
   */

  it('draws the current section as the ink pill', () => {
    const shell = file('layout/staff-shell.ts');
    const active = /const (?:DESKTOP|MOBILE)_ACTIVE = '[^']*\bbg-primary\b[^']*\btext-primary-foreground\b[^']*'/g;
    expect(shell.match(active)).toHaveLength(2);
  });

  it('marks a schedule block with one hairline, never a coloured side bar', () => {
    // The craft floor refuses a coloured `border-left`/`border-right` above 1px.
    expect(offenders(/\bborder-[lr]-[2-9]\b/)).toEqual([]);
  });

  it('never cancels a control boundary, so a quiet fill keeps its hairline', () => {
    expect(offenders(/\bborder-transparent\b/)).toEqual([]);
  });

  it('keeps one hairline: a rule is never dashed', () => {
    expect(offenders(/\bborder-dashed\b/)).toEqual([]);
  });

  it('never sets a heading in tracked capitals', () => {
    expect(offenders(/<h[1-6][^>]*\buppercase\b/)).toEqual([]);
  });

  it('prints a figure at the stat step, tight, with tabular numerals', () => {
    const card = file('components/report-card.ts');
    for (const required of ['text-3xl', 'tracking-tight', 'tabular-nums']) {
      expect(card).toContain(required);
    }
  });
});
