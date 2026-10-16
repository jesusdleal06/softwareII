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
});
