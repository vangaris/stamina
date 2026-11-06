import { afterEach, describe, expect, it, vi } from 'vitest';

const UUID_V7_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function timestampOf(id: string): number {
  return Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16);
}

/** `newId` remembers the last millisecond it used, so each test starts from a fresh module. */
async function freshNewId(): Promise<() => string> {
  vi.resetModules();
  return (await import('./new-id.ts')).newId;
}

describe('newId', () => {
  afterEach(() => vi.useRealTimers());

  it('is a lowercase UUID with version 7 and the RFC variant', async () => {
    const newId = await freshNewId();
    for (let count = 0; count < 200; count += 1) expect(newId()).toMatch(UUID_V7_FORMAT);
  });

  it('carries the current time in its first 48 bits', async () => {
    const newId = await freshNewId();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T10:15:30.123Z'));

    expect(timestampOf(newId())).toBe(Date.parse('2026-11-06T10:15:30.123Z'));
  });

  it('sorts by creation time across milliseconds', async () => {
    const newId = await freshNewId();
    vi.useFakeTimers();
    vi.setSystemTime(1_800_000_000_000);
    const first = newId();
    vi.setSystemTime(1_800_000_000_001);
    const second = newId();
    vi.setSystemTime(1_800_000_060_000);
    const third = newId();

    expect([third, first, second].sort()).toEqual([first, second, third]);
  });

  it('keeps ids made in one millisecond unique and in order', async () => {
    const newId = await freshNewId();
    vi.useFakeTimers();
    vi.setSystemTime(1_800_000_100_000);
    const ids = Array.from({ length: 3000 }, () => newId());

    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never goes backwards when the clock steps back', async () => {
    const newId = await freshNewId();
    vi.useFakeTimers();
    vi.setSystemTime(1_800_000_200_000);
    const before = newId();
    vi.setSystemTime(1_800_000_199_000);
    const after = newId();

    expect(after > before).toBe(true);
  });

  it('keeps counting past a full millisecond of ids without repeating', async () => {
    const newId = await freshNewId();
    vi.useFakeTimers();
    vi.setSystemTime(1_800_000_300_000);
    const ids = Array.from({ length: 5000 }, () => newId());

    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is unique across many ids', async () => {
    const newId = await freshNewId();
    const ids = new Set(Array.from({ length: 10_000 }, () => newId()));

    expect(ids.size).toBe(10_000);
  });
});
