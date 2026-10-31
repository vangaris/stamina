import { describe, expect, it } from 'vitest';
import type { Token } from '../types.ts';
import { flatten } from './flatten.ts';
import { resolveAll } from './resolve-all.ts';

const primitives = (tree: Parameters<typeof flatten>[0]) =>
  new Map<string, Token>(flatten(tree).map((t) => [t.path.join('.'), t]));

describe('resolveAll', () => {
  it('replaces each alias with the primitive value, keeping the semantic path', () => {
    const prims = primitives({ blue: { 500: { $value: '#0000ff' } } });
    const [token] = resolveAll({ color: { accent: { $value: '{blue.500}' } } }, prims);
    expect(token?.path).toEqual(['color', 'accent']);
    expect(token?.value).toBe('#0000ff');
  });

  it('follows a chain of aliases inside the primitive tier', () => {
    const prims = primitives({
      a: { $value: '{b}' },
      b: { $value: '{c}' },
      c: { $value: '1rem' },
    });
    expect(resolveAll({ x: { $value: '{a}' } }, prims)[0]?.value).toBe('1rem');
  });

  it('rejects an alias cycle and names the loop', () => {
    const prims = primitives({ a: { $value: '{b}' }, b: { $value: '{a}' } });
    expect(() => resolveAll({ x: { $value: '{a}' } }, prims)).toThrow(/alias cycle: a -> b -> a/);
  });

  it('rejects an alias that points at nothing', () => {
    expect(() => resolveAll({ x: { $value: '{missing.token}' } }, new Map())).toThrow(
      /\{missing\.token\} does not exist/,
    );
  });

  it('rejects a semantic token holding a raw value, even a value merely containing braces', () => {
    const prims = primitives({ a: { $value: '1' } });
    expect(() => resolveAll({ x: { $value: '#fff' } }, prims)).toThrow(/x must alias/);
    expect(() => resolveAll({ x: { $value: 'pre {a}' } }, prims)).toThrow(/x must alias/);
  });
});
