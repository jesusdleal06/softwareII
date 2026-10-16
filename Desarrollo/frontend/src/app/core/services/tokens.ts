import { InjectionToken } from '@angular/core';

/** Returns the current instant. Override in tests for deterministic dates. */
export type Clock = () => Date;

export const CLOCK = new InjectionToken<Clock>('CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/** Minimal storage used to keep the prototype session per browser tab. */
export type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const SESSION_STORAGE = new InjectionToken<SessionStorageLike | null>('SESSION_STORAGE', {
  providedIn: 'root',
  factory: () => (typeof sessionStorage === 'undefined' ? null : sessionStorage),
});
