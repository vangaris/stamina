import { describe, expect, it } from 'vitest';
import { tailwindName } from './tailwind-name.ts';

describe('tailwindName', () => {
  it.each([
    [['color', 'bg'], '--color-bg'],
    [['color', 'text', 'muted'], '--color-text-muted'],
    [['radius', 'md'], '--radius-md'],
    [['space', '4'], '--spacing-4'],
    [['font', 'family', 'sans'], '--font-sans'],
    [['font', 'size', 'lg'], '--text-lg'],
    [['font', 'leading', 'lg'], '--text-lg--line-height'],
    [['duration', 'base'], '--default-transition-duration'],
  ])('maps %j to %s', (path, expected) => {
    expect(tailwindName(path)).toBe(expected);
  });

  it.each([[['font', 'weight', 'bold']], [['duration', 'fast']], [['easing', 'standard']], [[]]])(
    'has no Tailwind variable for %j',
    (path) => {
      expect(tailwindName(path)).toBeUndefined();
    },
  );
});
