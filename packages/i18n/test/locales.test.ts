import { describe, expect, it } from 'vitest';
import { findTranslationProblems, formatMessage, messages, resolveLocale } from '../src/index.ts';

describe('the shipped locales', () => {
  it('give every English key a Greek value with the same ICU arguments', () => {
    expect(findTranslationProblems(messages.en, messages.el)).toEqual([]);
  });
});

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

describe('formatMessage', () => {
  it('applies the plural rules of the locale', () => {
    const message = '{n, plural, =0 {none} one {# set} other {# sets}}';
    expect(formatMessage('en', message, { n: 0 })).toBe('none');
    expect(formatMessage('en', message, { n: 1 })).toBe('1 set');
    expect(formatMessage('en', message, { n: 3 })).toBe('3 sets');
  });

  it('uses the Greek number format', () => {
    expect(formatMessage('el', '{n, number}', { n: 1234.5 })).toBe('1.234,5');
    expect(formatMessage('en', '{n, number}', { n: 1234.5 })).toBe('1,234.5');
  });
});

describe('resolveLocale', () => {
  it('maps the first supported language of the phone, ignoring region', () => {
    expect(resolveLocale(['de-DE', 'el-GR', 'en-US'])).toBe('el');
    expect(resolveLocale(['EL'])).toBe('el');
  });

  it('falls back to English', () => {
    expect(resolveLocale(['fr-FR'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
  });
});
