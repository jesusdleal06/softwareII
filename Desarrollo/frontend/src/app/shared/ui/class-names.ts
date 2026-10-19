/** Joins truthy class names (tiny local replacement for clsx; no Tailwind conflict merging). */
export function cn(...classes: ReadonlyArray<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility prefixes where a later class must replace an earlier one (subset of tailwind-merge).
 *
 * The audit found consumers passing an override that the base silently kept, because only
 * four groups were covered. Each entry covers one Tailwind property, so `base` classes in
 * that group are dropped when `extra` sets the same property.
 *
 * Padding and gap are deliberately split per side: `px-4` also sets the left padding, so
 * `pr-2` must not evict it. Only the same property replaces the same property.
 */
const CONFLICT_GROUPS: readonly RegExp[] = [
  /^min-h-/,
  /^h-/,
  /^w-/,
  /^max-w-/,
  /^text-(xs|sm|base|lg|xl|[2-9]xl)$/,
  /^font-(normal|medium|semibold|bold)$/,
  /^rounded$/,
  /^rounded-(sm|md|lg|xl|2xl|3xl|4xl|full|none)$/,
  /^p-(?![xytbrl])/,
  /^px-/,
  /^py-/,
  /^pt-/,
  /^pr-/,
  /^pb-/,
  /^pl-/,
  /^gap-(?!x-|y-)/,
  /^gap-x-/,
  /^gap-y-/,
  /^border(-(0|2|4|8))?$/,
  /^shadow$/,
  /^shadow-(xs|sm|md|lg|xl|2xl|none)$/,
];

interface SplitClass {
  /** Everything before the last `:` (`sm`, `hover`, `focus-visible`, a data attribute…). */
  readonly variant: string;
  readonly utility: string;
}

function splitVariant(className: string): SplitClass {
  const index = className.lastIndexOf(':');
  return index === -1
    ? { variant: '', utility: className }
    : { variant: className.slice(0, index), utility: className.slice(index + 1) };
}

/**
 * Appends `extra` to `base`, dropping base classes that an extra class overrides
 * (e.g. `min-h-14 text-lg` + `min-h-12 text-base`), like the prototype's `cn` (tailwind-merge).
 *
 * A class only evicts one with the SAME variant: `sm:min-h-12` must not remove the
 * unconditional `min-h-14`, because that would leave mobile with no min-height at all.
 */
export function mergeClasses(base: string, extra: string | null | undefined): string {
  const extras = (extra ?? '').split(/\s+/).filter(Boolean);
  if (extras.length === 0) return base;

  const overridden = new Set<string>();
  for (const className of extras) {
    const { variant, utility } = splitVariant(className);
    const group = CONFLICT_GROUPS.findIndex((candidate) => candidate.test(utility));
    if (group !== -1) overridden.add(`${variant}|${group}`);
  }
  if (overridden.size === 0) return [...base.split(/\s+/).filter(Boolean), ...extras].join(' ');

  const kept = base.split(/\s+/).filter((className) => {
    if (!className) return false;
    const { variant, utility } = splitVariant(className);
    const group = CONFLICT_GROUPS.findIndex((candidate) => candidate.test(utility));
    return group === -1 || !overridden.has(`${variant}|${group}`);
  });
  return [...kept, ...extras].join(' ');
}
