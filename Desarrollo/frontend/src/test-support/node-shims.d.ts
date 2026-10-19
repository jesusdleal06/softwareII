/**
 * Minimal ambient declarations for the Node built-ins used by test infrastructure.
 *
 * The application itself never touches the filesystem, so the project does not
 * depend on `@types/node`. Design-system tests do need to read the real CSS to
 * measure token contrast, and this file gives the compiler just that surface.
 * This file must stay a global script (no imports or exports) so the module
 * declarations below are real ambient modules instead of augmentations.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean };
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}

declare const process: { cwd(): string };
