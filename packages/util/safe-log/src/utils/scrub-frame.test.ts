import { describe, expect, it } from 'vitest';
import { scrubFrame } from './scrub-frame.ts';

describe('scrubFrame', () => {
  it('keeps allowlisted fields and drops everything else', () => {
    const frame = {
      function: 'save',
      module: 'app',
      lineno: 10,
      colno: 4,
      in_app: true,
      vars: { weight: 80 },
      context_line: 'const pain = 7',
      pre_context: ['a'],
      post_context: ['b'],
    };

    expect(scrubFrame(frame)).toEqual({
      function: 'save',
      module: 'app',
      lineno: 10,
      colno: 4,
      in_app: true,
    });
  });

  it('strips query and fragment from filename and abs_path', () => {
    expect(
      scrubFrame({
        filename: '/assets/app.js?weight=80',
        abs_path: 'https://x.example/assets/app.js#pain',
      }),
    ).toEqual({ filename: '/assets/app.js', abs_path: 'https://x.example/assets/app.js' });
  });

  it('drops filename and abs_path when they are not strings', () => {
    expect(scrubFrame({ filename: { toString: () => 'x?y' }, abs_path: 5 })).toEqual({});
  });

  it('returns undefined for anything that is not an object', () => {
    for (const value of [null, undefined, 'frame', 3, []])
      expect(scrubFrame(value)).toBeUndefined();
  });
});
