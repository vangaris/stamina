import { describe, expect, it } from 'vitest';
import { shouldAnnounce } from './should-announce.ts';

describe('shouldAnnounce', () => {
  it('announces every 10 seconds', () => {
    expect([90, 80, 30, 20, 10].map((s) => shouldAnnounce(s, s + 1))).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it('stays quiet between those moments', () => {
    for (const s of [89, 71, 59, 41, 29, 11, 9, 6]) expect(shouldAnnounce(s, s + 1)).toBe(false);
  });

  it('announces each of the last five seconds, including 0', () => {
    for (const s of [5, 4, 3, 2, 1, 0]) expect(shouldAnnounce(s, s + 1)).toBe(true);
  });

  it('announces when time was added, even off the 10 s grid', () => {
    expect(shouldAnnounce(75, 60)).toBe(true);
  });

  it('never repeats an unchanged value', () => {
    expect(shouldAnnounce(30, 30)).toBe(false);
    expect(shouldAnnounce(0, 0)).toBe(false);
  });

  it('judges a first value on its own', () => {
    expect(shouldAnnounce(90)).toBe(true);
    expect(shouldAnnounce(87)).toBe(false);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('ignores %s', (s) => {
    expect(shouldAnnounce(s, 10)).toBe(false);
  });
});
