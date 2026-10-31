import { describe, expect, it } from 'vitest';
import { declarations } from './declarations.ts';

describe('declarations', () => {
  it('emits one prefixed, indented line per token, joined by newlines', () => {
    const out = declarations(
      [
        { path: ['space', '2'], type: 'dimension', value: '0.5rem' },
        { path: ['font', 'family', 'sans'], type: 'fontFamily', value: ['Segoe UI', 'sans-serif'] },
      ],
      '    ',
    );
    expect(out).toBe(
      '    --st-space-2: 0.5rem;\n    --st-font-family-sans: "Segoe UI", sans-serif;',
    );
  });

  it('emits nothing for no tokens', () => {
    expect(declarations([], '  ')).toBe('');
  });
});
