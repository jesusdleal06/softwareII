#!/usr/bin/env node
/*
 * Guards the CSP `script-src` hashes against the production build (CP-RNF03-04).
 *
 * Angular inlines two scripts in `dist/.../browser/index.html`: the theme bootstrap from
 * `src/index.html` and the beasties media-toggle script injected by the critical-CSS
 * inliner. Both need a `'sha256-...'` source in the `Content-Security-Policy` header, and
 * the hash is computed over the exact bytes the build produced. Run this after `pnpm build`:
 *
 *   node scripts/check-csp-hash.mjs            # fails when a hash is missing or stale
 *   node scripts/check-csp-hash.mjs --update   # rewrites the hashes in vercel.json
 *
 * Env: DIST_INDEX (default dist/villadent-frontend/browser/index.html).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..');
const vercelPath = resolve(root, 'vercel.json');
const indexPath = resolve(
  root,
  process.env.DIST_INDEX ?? 'dist/villadent-frontend/browser/index.html',
);
const update = process.argv.includes('--update');

if (!existsSync(indexPath)) {
  console.error(`check-csp-hash: missing ${indexPath}; run "pnpm build" first.`);
  process.exit(1);
}

const vercel = JSON.parse(readFileSync(vercelPath, 'utf8'));
const cspHeader = (vercel.headers ?? [])
  .flatMap((rule) => rule.headers ?? [])
  .find((header) => header.key.toLowerCase() === 'content-security-policy');
if (!cspHeader) {
  console.error('check-csp-hash: vercel.json has no Content-Security-Policy header.');
  process.exit(1);
}

const html = readFileSync(indexPath, 'utf8');
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim().length > 0);

if (inlineScripts.length === 0) {
  console.error(`check-csp-hash: no inline scripts found in ${indexPath}.`);
  process.exit(1);
}

const hashes = inlineScripts.map(
  (source) => `sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}`,
);

console.log(`check-csp-hash: ${inlineScripts.length} inline script(s) in ${indexPath}`);
for (const [index, hash] of hashes.entries()) {
  const preview = inlineScripts[index].trim().replace(/\s+/g, ' ').slice(0, 70);
  console.log(`  '${hash}'  ${preview}...`);
}

const declared = new Set(
  [...cspHeader.value.matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map((match) => `sha256-${match[1]}`),
);
const missing = hashes.filter((hash) => !declared.has(hash));
const stale = [...declared].filter((hash) => !hashes.includes(hash));

if (update) {
  const directive = `script-src 'self' ${hashes.map((hash) => `'${hash}'`).join(' ')}`;
  cspHeader.value = cspHeader.value.replace(/script-src [^;]+/, directive);
  writeFileSync(vercelPath, `${JSON.stringify(vercel, null, 2)}\n`);
  console.log(`check-csp-hash: updated script-src in vercel.json (${hashes.length} hash(es)).`);
  process.exit(0);
}

if (missing.length > 0 || stale.length > 0) {
  console.error('check-csp-hash: CSP script-src is out of sync with the production build.');
  for (const hash of missing) console.error(`  missing '${hash}'`);
  for (const hash of stale) console.error(`  stale   '${hash}'`);
  console.error('Run "node scripts/check-csp-hash.mjs --update" after reviewing the diff.');
  process.exit(1);
}

console.log('check-csp-hash: OK, every inline script hash is declared in vercel.json.');
