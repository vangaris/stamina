import { describe, expect, it } from 'vitest';
import { createMemorySessionLog } from './create-memory-session-log.ts';

const SESSION = '00000000-0000-4000-8000-000000000001';
const RECORDED_AT = '2026-11-06T10:00:00.000Z';

describe('createMemorySessionLog', () => {
  it('removes a finish only when it is the one with that id', async () => {
    const log = createMemorySessionLog();
    await log.recordFinish(SESSION, { finish: { id: 'f1', rpe: 7 }, recordedAt: RECORDED_AT });

    await log.removeFinish(SESSION, 'f2');
    expect((await log.read(SESSION)).finish?.finish.id).toBe('f1');

    await log.removeFinish(SESSION, 'f1');
    expect((await log.read(SESSION)).finish).toBeNull();
  });
});
