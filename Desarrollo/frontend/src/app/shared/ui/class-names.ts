/** Joins truthy class names (tiny local replacement for clsx; no Tailwind conflict merging). */
export function cn(...classes: ReadonlyArray<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
