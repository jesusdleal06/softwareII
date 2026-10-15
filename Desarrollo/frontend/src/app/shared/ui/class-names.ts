/** Joins truthy class names (tiny local replacement for clsx; no Tailwind conflict merging). */
export function cn(...classes: ReadonlyArray<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Utility groups where a later class must replace an earlier one (subset of tailwind-merge). */
const CONFLICT_GROUPS: readonly RegExp[] = [
  /^min-h-/,
  /^text-(xs|sm|base|lg|xl|[2-9]xl)$/,
  /^pr-/,
  /^pl-/,
];

/**
 * Appends `extra` to `base`, dropping base classes that an extra class overrides
 * (e.g. `min-h-14 text-lg` + `min-h-12 text-base`), like the prototype's `cn` (tailwind-merge).
 */
export function mergeClasses(base: string, extra: string | null | undefined): string {
  const extras = (extra ?? '').split(/\s+/).filter(Boolean);
  if (extras.length === 0) return base;
  const overridden = CONFLICT_GROUPS.filter((group) => extras.some((c) => group.test(c)));
  const kept = base
    .split(/\s+/)
    .filter((c) => c && !overridden.some((group) => group.test(c)));
  return [...kept, ...extras].join(' ');
}
