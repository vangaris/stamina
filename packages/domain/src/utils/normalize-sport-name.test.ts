import { describe, expect, it } from 'vitest';
import { normalizeSportName } from './normalize-sport-name.ts';

describe('normalizeSportName', () => {
  it('makes case, repeated spaces and surrounding spaces irrelevant', () => {
    expect(normalizeSportName('  Beach   Tennis ')).toBe('beach tennis');
    expect(normalizeSportName('beach tennis')).toBe(normalizeSportName('BEACH\tTENNIS'));
  });

  it('strips accents so two spellings are one sport', () => {
    expect(normalizeSportName('Pétanque')).toBe(normalizeSportName('petanque'));
  });

  it('folds compatibility forms such as full-width letters', () => {
    expect(normalizeSportName('ＰＡＤＥＬ')).toBe('padel');
  });

  it('keeps Greek letters (accents stripped), so Greek names stay distinct sports', () => {
    expect(normalizeSportName('Τένις')).toBe(normalizeSportName('τενις'));
    expect(normalizeSportName('Τένις')).not.toBe(normalizeSportName('Μπάσκετ'));
  });

  it('returns an empty key for a name with nothing to match on', () => {
    expect(normalizeSportName('   ')).toBe('');
  });
});
