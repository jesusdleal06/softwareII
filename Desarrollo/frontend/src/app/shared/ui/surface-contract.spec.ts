import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Surface contract (S5-S8 of `odd/tasks/estilo-referencia-tarjetas.md`).
 *
 * The card-on-canvas restyle is a rule about which token paints which surface, and
 * it is not observable through the DOM: jsdom applies no stylesheet, so a card that
 * silently lost its border, or a field whose fill replaced the `border-input`
 * boundary, would keep every behavioural test green. This spec reads the shared
 * layer the way `design-tokens.spec.ts` reads the token blocks, so the vocabulary the
 * views consume cannot drift away from the contract.
 */

const ROOT = resolve(process.cwd());
const STYLES = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');

/** Body of the top-level `@utility <name> { ... }` block, by brace matching. */
function utility(name: string): string {
  const pattern = new RegExp(`@utility\\s+${name}\\s*\\{`);
  const match = pattern.exec(STYLES);
  if (!match) return '';
  const open = STYLES.indexOf('{', match.index);
  let depth = 0;
  for (let i = open; i < STYLES.length; i += 1) {
    if (STYLES[i] === '{') depth += 1;
    if (STYLES[i] === '}' && (depth -= 1) === 0) return STYLES.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces in @utility ${name}`);
}

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) found.push(full);
  }
  return found;
}

describe('card-on-canvas surface contract', () => {
  it('paints the page canvas from the muted/background pair', () => {
    const canvas = squash(utility('canvas'));
    expect(canvas).toContain('bg-muted');
    expect(canvas).toContain('dark:bg-background');
  });

  it('gives every content group a card that declares its elevation once', () => {
    const card = squash(utility('card'));
    for (const required of ['rounded-xl', 'border', 'border-border', 'bg-card', 'p-5', 'sm:p-6']) {
      expect(card).toContain(required);
    }
    // Border, never border plus shadow (elevation is declared once).
    expect(card).not.toMatch(/shadow/);
  });

  it('keeps the input boundary at full strength under the field fill', () => {
    const field = squash(utility('field'));
    for (const required of ['rounded-md', 'border', 'border-input', 'bg-muted', 'dark:bg-secondary', 'h-10']) {
      expect(field).toContain(required);
    }
    // L4: the fill is added to the 3:1 boundary, never substituted for it.
    const source = readFileSync(join(ROOT, 'src/app/shared/ui/field.ts'), 'utf8');
    expect(source).toContain('border-input');
    expect(source).toContain('bg-muted');
    expect(source).toContain('dark:bg-secondary');
  });

  it('draws the quiet button as a fill, never as an outline', () => {
    const quiet = squash(utility('btn-quiet'));
    for (const required of ['rounded-md', 'bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80']) {
      expect(quiet).toContain(required);
    }
    expect(quiet).not.toContain('border-input');
  });

  it('draws the primary button as a solid primary fill with a pointer response', () => {
    const primary = squash(utility('btn-primary'));
    for (const required of [
      'rounded-md',
      'bg-primary',
      'text-primary-foreground',
      'hover:bg-primary/90',
      'active:translate-y-px',
      'focus-visible:ring-2',
      'disabled:opacity-50',
    ]) {
      expect(primary).toContain(required);
    }
  });

  it('separates rows with one hairline and a muted hover', () => {
    const row = squash(utility('row'));
    for (const required of ['border-b', 'border-border', 'last:border-0', 'py-3', 'hover:bg-muted/60']) {
      expect(row).toContain(required);
    }
  });

  it('draws the status badge as a small uppercase tag', () => {
    const badge = squash(utility('badge'));
    for (const required of ['rounded-sm', 'px-2', 'py-0.5', 'text-[11px]', 'uppercase', 'tracking-wide']) {
      expect(badge).toContain(required);
    }
  });

  it('themes the browser surfaces from tokens', () => {
    expect(STYLES).toMatch(/::selection\s*\{[^}]*var\(--/);
    expect(STYLES).toMatch(/scrollbar-color:\s*var\(--/);
    expect(STYLES).toMatch(/caret-color:\s*var\(--/);
  });

  it('never writes a literal colour in a shared template or component', () => {
    const literal = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\boklch\(|\bhsla?\(/;
    const offenders = ['ui', 'booking']
      .flatMap((dir) => sourceFiles(join(ROOT, 'src/app/shared', dir)))
      .filter((file) => literal.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(`${ROOT}/`, ''));
    expect(offenders).toEqual([]);
  });
});
