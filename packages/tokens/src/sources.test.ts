import { describe, expect, it } from 'vitest';
import { sources } from './sources.ts';
import { flatten } from './utils/flatten.ts';

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
