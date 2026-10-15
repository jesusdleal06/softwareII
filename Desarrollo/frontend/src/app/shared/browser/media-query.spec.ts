import { createEnvironmentInjector, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mediaQuery } from './media-query';

describe('mediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  function create(): { injector: EnvironmentInjector; destroy: () => void } {
    const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    return { injector, destroy: () => injector.destroy() };
  }

  it('is false when matchMedia is not available (jsdom)', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { injector } = create();
    const matches = runInInjectionContext(injector, () => mediaQuery('(max-width: 1023px)'));
    expect(matches()).toBe(false);
  });

  it('follows the media query and stops listening on destroy', () => {
    let listener: ((e: { matches: boolean }) => void) | null = null;
    const mql = {
      matches: true,
      addEventListener: vi.fn((_type: string, fn: (e: { matches: boolean }) => void) => (listener = fn)),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => mql));
    const { injector, destroy } = create();
    const matches = runInInjectionContext(injector, () => mediaQuery('(max-width: 1023px)'));
    expect(matches()).toBe(true);
    listener!({ matches: false });
    expect(matches()).toBe(false);
    destroy();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', listener);
  });
});
