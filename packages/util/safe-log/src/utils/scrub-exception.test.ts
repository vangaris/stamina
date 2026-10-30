import { describe, expect, it } from 'vitest';
import { scrubException } from './scrub-exception.ts';

describe('scrubException', () => {
  it('blanks the message because it can embed health data', () => {
    expect(scrubException({ type: 'TypeError', value: 'bad weight: 80kg' })).toEqual({
      type: 'TypeError',
      value: '',
    });
  });

  it('falls back to "Error" when the type is missing or not a string', () => {
    expect(scrubException({})).toEqual({ type: 'Error', value: '' });
    expect(scrubException({ type: 42 })).toEqual({ type: 'Error', value: '' });
  });

  it('caps the type length so a type cannot carry a long payload', () => {
    const result = scrubException({ type: 'E'.repeat(500) });

    expect(result?.type).toBe('E'.repeat(100));
  });

  it('keeps only allowlisted mechanism fields', () => {
    const result = scrubException({
      mechanism: { type: 'onerror', handled: false, synthetic: true, data: { note: 'private' } },
    });

    expect(result?.mechanism).toEqual({ type: 'onerror', handled: false, synthetic: true });
  });

  it('scrubs each stack frame and drops entries that are not frames', () => {
    const result = scrubException({
      stacktrace: {
        frames: [{ function: 'f', filename: '/a.js?q=1', vars: { x: 1 } }, 'junk', null],
      },
    });

    expect(result?.stacktrace).toEqual({ frames: [{ function: 'f', filename: '/a.js' }] });
  });

  it('omits the stacktrace when frames is not an array', () => {
    expect(scrubException({ stacktrace: { frames: 'nope' } })).not.toHaveProperty('stacktrace');
  });

  it('drops unknown exception fields', () => {
    expect(scrubException({ type: 'E', module: 'm', extra: 'x' })).toEqual({
      type: 'E',
      value: '',
    });
  });

  it('returns undefined for anything that is not an object', () => {
    for (const value of [null, undefined, 'e', 1, []])
      expect(scrubException(value)).toBeUndefined();
  });
});
