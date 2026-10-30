import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  compileTokens,
  flatten,
  sources,
  type TokenSources,
  type TokenTree,
} from '../src/index.ts';

type Theme = 'light' | 'dark';

function roles(theme: Theme): Map<string, string> {
  const primitives = new Map(flatten(sources.primitive).map((t) => [t.path.join('.'), t.value]));
  return new Map(
    flatten(sources[theme]).map((t) => {
      const ref = /^\{(.+)\}$/.exec(String(t.value))?.[1] ?? '';
      return [t.path.join('.'), String(primitives.get(ref))];
    }),
  );
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground role, background role, minimum ratio]: 4.5 for text (WCAG AA), 3 for UI parts.
const PAIRS: [string, string, number][] = [
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['text', 'surface-sunken', 4.5],
  ['text-muted', 'bg', 4.5],
  ['text-muted', 'surface', 4.5],
  ['text-muted', 'surface-sunken', 4.5],
  ['on-accent', 'accent', 4.5],
  ['on-accent-soft', 'accent-soft', 4.5],
  ['on-load', 'load', 4.5],
  ['on-load-soft', 'load-soft', 4.5],
  ['on-suggest', 'suggest', 4.5],
  ['on-suggest-soft', 'suggest-soft', 4.5],
  ['on-danger', 'danger', 4.5],
  ['on-danger-soft', 'danger-soft', 4.5],
  ['accent', 'bg', 4.5],
  ['accent', 'surface', 4.5],
  ['load', 'surface', 4.5],
  ['danger', 'surface', 4.5],
  ['focus', 'bg', 3],
  ['focus', 'surface', 3],
  ['border-strong', 'bg', 3],
  ['border-strong', 'surface', 3],
];

describe.each(['light', 'dark'] as const)('%s theme', (theme) => {
  const colors = roles(theme);
  it.each(PAIRS)('%s on %s reaches contrast %f', (fg, bg, min) => {
    const ratio = contrast(colors.get(`color.${fg}`)!, colors.get(`color.${bg}`)!);
    expect(ratio, `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
  });
});

describe('compiled CSS', () => {
  const css = compileTokens(sources);

  it('is what is committed, so the build was run after editing a token', () => {
    const committed = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');
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
    const lightRoles = [...roles('light').keys()].map((k) => `--st-${k.replaceAll('.', '-')}:`);
    const [rootAndLight, osDark, forcedDark] = [
      css.slice(css.indexOf(':root,\n[data-theme')),
      css.slice(css.indexOf('@media (prefers-color-scheme: dark)')),
      css.slice(css.indexOf("[data-theme='dark']")),
    ];
    for (const role of lightRoles) {
      for (const block of [rootAndLight, osDark, forcedDark]) expect(block).toContain(role);
    }
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
