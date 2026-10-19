import { mergeClasses } from './class-names';

describe('mergeClasses', () => {
  it('lets extra classes override conflicting size utilities', () => {
    expect(mergeClasses('w-full min-h-14 px-4 text-lg text-foreground', 'min-h-12 text-base')).toBe(
      'w-full px-4 text-foreground min-h-12 text-base',
    );
  });

  it('overrides right padding only', () => {
    expect(mergeClasses('px-4 pr-12 border', 'pr-14')).toBe('px-4 border pr-14');
  });

  it('returns the base unchanged without extras', () => {
    expect(mergeClasses('a b', undefined)).toBe('a b');
    expect(mergeClasses('a b', '  ')).toBe('a b');
  });

  it('overrides the same property across more groups than the original four', () => {
    expect(mergeClasses('rounded-2xl p-4 font-semibold', 'rounded-full p-6')).toBe(
      'font-semibold rounded-full p-6',
    );
    expect(mergeClasses('h-10 w-full max-w-md', 'h-12')).toBe('w-full max-w-md h-12');
  });

  it('keeps a per-side property from evicting the whole axis', () => {
    // `px-4` also sets the left padding, so a right-side override must not drop it.
    expect(mergeClasses('px-4 py-2', 'pr-14')).toBe('px-4 py-2 pr-14');
    expect(mergeClasses('gap-4', 'gap-y-2')).toBe('gap-4 gap-y-2');
  });

  it('never lets a variant override evict the unconditional class', () => {
    // `sm:min-h-12` must not remove `min-h-14`: mobile would lose its min-height entirely.
    expect(mergeClasses('min-h-14 text-lg', 'sm:min-h-12')).toBe('min-h-14 text-lg sm:min-h-12');
    expect(mergeClasses('min-h-14', 'sm:min-h-12 sm:text-base')).toBe('min-h-14 sm:min-h-12 sm:text-base');
  });

  it('still overrides when the variant matches exactly', () => {
    expect(mergeClasses('min-h-14 sm:min-h-12', 'sm:min-h-10')).toBe('min-h-14 sm:min-h-10');
  });

  it('leaves a non-conflicting utility in place', () => {
    expect(mergeClasses('bg-card text-foreground', 'border-destructive')).toBe(
      'bg-card text-foreground border-destructive',
    );
  });
});
