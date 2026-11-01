import { describe, expect, it } from 'vitest';
import { findTranslationProblems } from './find-translation-problems.ts';

describe('findTranslationProblems', () => {
  const en = { a: 'Hello {name}', nested: { b: '{n, plural, one {# set} other {# sets}}' } };

  it('is empty for a complete translation', () => {
    const el = { a: 'Γεια {name}', nested: { b: '{n, plural, one {# σετ} other {# σετ}}' } };
    expect(findTranslationProblems(en, el)).toEqual([]);
  });

  it('flags a key with no Greek value, or a blank one', () => {
    expect(findTranslationProblems(en, { a: 'Γεια {name}' })).toEqual(['missing: nested.b']);
    expect(findTranslationProblems(en, { a: ' ', nested: { b: '{n}' } })).toContain('missing: a');
  });

  it('flags a translation that drops or renames an argument', () => {
    const el = { a: 'Γεια {όνομα}', nested: { b: '{n, plural, other {# σετ}}' } };
    expect(findTranslationProblems(en, el)).toEqual(['arguments differ: a (en {name} vs {όνομα})']);
  });

  it('flags a message that is not valid ICU', () => {
    const problems = findTranslationProblems(en, { a: 'Γεια {name', nested: { b: '{n}' } });
    expect(problems[0]).toMatch(/^invalid ICU: a/);
  });

  it('flags Greek keys that English does not have', () => {
    const el = { a: 'Γεια {name}', nested: { b: '{n}' }, extra: 'x' };
    expect(findTranslationProblems(en, el)).toEqual(['not in English: extra']);
  });
});
