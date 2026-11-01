import { describe, expect, it } from 'vitest';
import { flatten } from './flatten.ts';

describe('flatten', () => {
  it('returns tokens in document order with their full path', () => {
    const tokens = flatten({
      b: { one: { $value: '1' } },
      a: { two: { $value: '2' }, deep: { three: { $value: '3' } } },
    });
    expect(tokens.map((t) => t.path.join('.'))).toEqual(['b.one', 'a.two', 'a.deep.three']);
  });

  it('inherits $type from the nearest group and lets a token override it', () => {
    const tokens = flatten({
      $type: 'color',
      outer: {
        $type: 'dimension',
        inherits: { $value: '1rem' },
        own: { $type: 'number', $value: 1 },
      },
      top: { $value: '#fff' },
    });
    expect(tokens.map((t) => t.type)).toEqual(['dimension', 'number', 'color']);
  });

  it('skips $-prefixed metadata and non-object values', () => {
    const tokens = flatten({
      $description: { $value: 'not a token' },
      note: 'text',
      ok: { $value: 1 },
    });
    expect(tokens.map((t) => t.path.join('.'))).toEqual(['ok']);
  });
});
