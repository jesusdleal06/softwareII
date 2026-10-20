import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Focus indicator contract.
 *
 * The audit found the focus ring carrying an alpha (`ring-ring/30`, `/40`, `/50`
 * measured 1.54, 1.81 and 2.13:1 over white) while 11 of 12 offenders relied on
 * the ring alone to signal focus, with `field.ts` the only control that also
 * flipped its border. That is below the 3:1 WCAG requirement for non-text UI, and
 * invisible to every other test: it lives in class strings, not in behaviour.
 *
 * The ring token itself is measured against the background in
 * `design-tokens.spec.ts`; this spec keeps every consumer from fading it back.
 */

const ROOT = resolve(process.cwd());

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(ts|html|css)$/.test(entry) && !entry.endsWith('.spec.ts')) found.push(full);
  }
  return found;
}

const SOURCES = sourceFiles(join(ROOT, 'src/app')).map((file) => ({
  path: file.replace(`${ROOT}/`, ''),
  content: readFileSync(file, 'utf8'),
}));

describe('focus indicator contract', () => {
  it('never fades the focus ring below the 3:1 requirement', () => {
    const forbidden = /(ring-ring\/(?:30|40|50))|(outline-ring\/50)/;
    const offenders = SOURCES.filter((file) => forbidden.test(file.content)).map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('draws every focus-visible ring at the contracted width and token', () => {
    const offenders: string[] = [];
    for (const file of SOURCES) {
      const matches = file.content.matchAll(/focus-visible:ring-(\d+)/g);
      for (const match of matches) {
        if (match[1] !== '2') offenders.push(`${file.path}: focus-visible:ring-${match[1]}`);
      }
      if (/focus-visible:ring-(?:3|4|8)\b/.test(file.content) && !/focus-visible:ring-2/.test(file.content)) {
        offenders.push(`${file.path}: ring width without the contracted ring`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
