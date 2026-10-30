import { describe, expect, it } from 'vitest';
import { stripUrlQuery } from './strip-url-query.ts';

describe('stripUrlQuery', () => {
  it('drops the query string', () => {
    expect(stripUrlQuery('https://app.example/a.js?weight=80')).toBe('https://app.example/a.js');
  });

  it('drops the fragment', () => {
    expect(stripUrlQuery('/assets/a.js#pain')).toBe('/assets/a.js');
  });

  it('cuts at whichever of ? and # comes first', () => {
    expect(stripUrlQuery('/a.js#frag?x=1')).toBe('/a.js');
    expect(stripUrlQuery('/a.js?x=1#frag')).toBe('/a.js');
  });

  it('leaves a clean URL and the empty string unchanged', () => {
    expect(stripUrlQuery('/a/b.js')).toBe('/a/b.js');
    expect(stripUrlQuery('')).toBe('');
  });
});
