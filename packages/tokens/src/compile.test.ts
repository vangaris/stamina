import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileTokens } from './compile.ts';
import { sources } from './sources.ts';
import type { TokenSources, TokenTree } from './types.ts';
import { flatten } from './utils/flatten.ts';

const roleNames = (theme: 'light' | 'dark') => flatten(sources[theme]).map((t) => t.path.join('.'));

describe('compiled CSS', () => {
  const css = compileTokens(sources);

  it('is what is committed, so the build was run after editing a token', () => {
    const committed = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
    expect(committed).toBe(css);
  });

  it('carries the placeholder scales from the plan', () => {
    for (const line of [
      '--st-font-size-xs: 0.75rem;',
      '--st-font-size-sm: 0.875rem;',
      '--st-font-size-base: 1rem;',
      '--st-font-size-lg: 1.25rem;',
      '--st-font-size-xl: 1.5rem;',
      '--st-font-size-2xl: 2rem;',
      '--st-font-size-3xl: 3rem;',
      '--st-space-1: 0.25rem;',
      '--st-space-2: 0.5rem;',
      '--st-space-3: 0.75rem;',
      '--st-space-4: 1rem;',
      '--st-space-6: 1.5rem;',
      '--st-space-8: 2rem;',
      '--st-radius-md: 0.5rem;',
      '--st-radius-lg: 1rem;',
      '--st-radius-pill: 9999px;',
      '--st-space-tap: 2.75rem;',
    ]) {
      expect(css).toContain(line);
    }
    expect(css).toMatch(/--st-font-family-sans: system-ui,/);
  });

  it('defines every role in light, in the OS dark query and in forced dark', () => {
    const lightRoles = roleNames('light').map((k) => `--st-${k.replaceAll('.', '-')}:`);
    const [rootAndLight, osDark, forcedDark] = [
      css.slice(css.indexOf(':root,\n[data-theme')),
      css.slice(css.indexOf('@media (prefers-color-scheme: dark)')),
      css.slice(css.indexOf("[data-theme='dark']")),
    ];
    for (const role of lightRoles) {
      for (const block of [rootAndLight, osDark, forcedDark]) expect(block).toContain(role);
    }
  });

  it('defines the shared focus style once, as an outside and an inside variant', () => {
    expect(css).toMatch(/@utility focus-ring \{[^}]*outline-offset: 2px/s);
    expect(css).toMatch(/@utility focus-ring-inset \{[^}]*outline-offset: -2px/s);
  });

  it('leaves Tailwind with no default colours', () => {
    expect(css).toContain('--color-*: initial;');
  });
});

describe('compiler errors', () => {
  const clone = (): TokenSources => structuredClone(sources);

  it('rejects a dark theme that lacks a light role', () => {
    const broken = clone();
    delete (broken.dark.color as TokenTree).focus;
    expect(() => compileTokens(broken)).toThrow(/same roles.*focus/);
  });

  it('rejects an alias to a token that does not exist', () => {
    const broken = clone();
    (broken.light.color as { bg: { $value: string } }).bg.$value = '{color.neutral.12345}';
    expect(() => compileTokens(broken)).toThrow(/does not exist/);
  });

  it('rejects a semantic token that holds a raw value', () => {
    const broken = clone();
    (broken.light.color as { bg: { $value: string } }).bg.$value = '#ffffff';
    expect(() => compileTokens(broken)).toThrow(/must alias a primitive/);
  });
});
