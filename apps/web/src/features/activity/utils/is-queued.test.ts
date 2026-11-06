import { QUEUED_RESULT } from '@stamina/app-core';
import { describe, expect, it } from 'vitest';
import { isQueued } from './is-queued.ts';

describe('isQueued', () => {
  it('recognises the queued answer and nothing else', () => {
    expect(isQueued(QUEUED_RESULT)).toBe(true);
    expect(isQueued({ recorded: true })).toBe(false);
  });
});
