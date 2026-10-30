import { describe, expect, it } from 'vitest';
import { messages } from './config.ts';
import { findTranslationProblems } from './utils/find-translation-problems.ts';

// CI gate: shipping an incomplete or mismatched translation fails here.
describe('the shipped locales', () => {
  it('give every English key a Greek value with the same ICU arguments', () => {
    expect(findTranslationProblems(messages.en, messages.el)).toEqual([]);
  });
});
