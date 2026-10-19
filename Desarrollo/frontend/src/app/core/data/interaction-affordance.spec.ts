import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Interaction affordance contract (S16).
 *
 * Browsers paint `<button>` and `<summary>` with the arrow cursor, so in the
 * audit every button in the app looked inert next to the links, which do get the
 * hand. jsdom applies no app stylesheet, so this contract is read from the source
 * of the base layer, the same way the focus and token contracts are.
 */

const ROOT = resolve(process.cwd());
const STYLES = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');

const REQUIRED_POINTER = [
  'button:not(:disabled)',
  "[role='button']:not([aria-disabled='true'])",
  'summary',
  'label[for]',
  'select:not(:disabled)',
  "input[type='checkbox']:not(:disabled)",
  "input[type='radio']:not(:disabled)",
];

/** Body of the block whose `{` follows `start`, by brace matching. */
function blockAfter(css: string, start: number): string {
  const open = css.indexOf('{', start);
  if (open < 0) throw new Error('no block opens at the requested offset');
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}' && (depth -= 1) === 0) return css.slice(open + 1, i);
  }
  throw new Error('unbalanced braces');
}

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

const BASE_LAYER = blockAfter(STYLES, STYLES.indexOf('@layer base'));
const RULES = [...BASE_LAYER.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
  selector: squash(match[1]),
  body: match[2],
}));

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(ts|html|css)$/.test(entry) && !entry.endsWith('.spec.ts')) found.push(full);
  }
  return found;
}

describe('interaction affordance contract', () => {
  it('gives the pointer to every interactive control', () => {
    const pointerSelectors = RULES.filter((rule) => /cursor:\s*pointer/.test(rule.body))
      .map((rule) => rule.selector)
      .join(', ');
    const missing = REQUIRED_POINTER.filter((selector) => !pointerSelectors.includes(selector));
    expect(missing).toEqual([]);
  });

  it('gives the blocked cursor to disabled and aria-disabled controls', () => {
    const blocked = RULES.filter((rule) => /cursor:\s*not-allowed/.test(rule.body));
    expect(blocked.length).toBeGreaterThan(0);
    const selectors = blocked.map((rule) => rule.selector).join(', ');
    expect(selectors).toContain(':disabled');
    expect(selectors).toContain('[aria-disabled=');
  });

  it('never falls back to the arrow cursor on something clickable', () => {
    const offenders = sourceFiles(join(ROOT, 'src/app'))
      .map((file) => ({ path: file.replace(`${ROOT}/`, ''), content: readFileSync(file, 'utf8') }))
      .filter((file) => /cursor-default/.test(file.content))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
    expect(/cursor\s*:\s*default/.test(STYLES)).toBe(false);
  });
});
