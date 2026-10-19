import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Copy and tint contract for the public surface.
 *
 * S6 and S2 are rules about visible strings and utility classes; they are not
 * observable through the DOM alone (the status enum and its S4 label happen to be
 * the same words today), so this spec reads the surface sources the way the design
 * token contract reads `styles.css`: it fails the suite if the defect comes back.
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

const FILES = sources(DIR).map((file) => ({
  path: file.replace(`${ROOT}/`, ''),
  source: readFileSync(file, 'utf8'),
}));

/** Strip comments so prose dashes or developer notes never count as visible copy. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('public surface copy and tint contract', () => {
  it('never uses an en or em dash as a separator in visible copy', () => {
    const offenders = FILES.filter((file) => /[—–]/.test(code(file.source))).map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('uses at most one middle dot per line', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const line of code(file.source).split('\n')) {
        if ((line.match(/·/g) ?? []).length > 1) offenders.push(`${file.path}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('unifies the labels of the same intent', () => {
    const banned = ['Reprogramar esa cita', 'Agendar una cita nueva'];
    const offenders = FILES.filter((file) => banned.some((label) => file.source.includes(label))).map(
      (file) => file.path,
    );
    expect(offenders).toEqual([]);
  });

  it('never prints the raw status enum as a visible label', () => {
    // The S4 map owns the copy; a bare interpolation would bypass it if a label ever changes.
    const offenders = FILES.filter((file) => /\{\{\s*[a-z]+\.status\s*\}\}/.test(file.source)).map(
      (file) => file.path,
    );
    expect(offenders).toEqual([]);
  });

  it('keeps every dark success tint at or below the S2 ceiling of 20', () => {
    const offenders = FILES.filter((file) => /dark:bg-success\/(?!20\b)/.test(file.source)).map(
      (file) => file.path,
    );
    expect(offenders).toEqual([]);
  });

  it('uses the full-opacity focus ring wherever a focus-visible indicator is declared', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const line of code(file.source).split('\n')) {
        if (line.includes('focus-visible') && !/focus-visible:ring-2/.test(line)) {
          offenders.push(`${file.path}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
