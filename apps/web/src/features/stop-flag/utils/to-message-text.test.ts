import { describe, expect, it } from 'vitest';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import { toMessageText } from './to-message-text.ts';

const t = (key: string) => `translated ${key}`;

describe('toMessageText', () => {
  it('translates a key', () => {
    expect(toMessageText(t, StopFlagMessageKey.AnswerRequired)).toBe(
      `translated ${StopFlagMessageKey.AnswerRequired}`,
    );
  });

  it('is nothing without a key', () => {
    expect(toMessageText(t, undefined)).toBeUndefined();
  });
});
