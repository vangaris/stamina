import { QUEUED_RESULT } from '@stamina/app-core';
import { RecordStatus } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { isQueued } from './is-queued.ts';

describe('isQueued', () => {
  it('tells the queued result from a server answer', () => {
    expect(isQueued(QUEUED_RESULT)).toBe(true);
    expect(isQueued({ status: RecordStatus.Saved, recorded: true })).toBe(false);
  });
});
