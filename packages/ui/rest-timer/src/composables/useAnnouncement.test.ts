import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useAnnouncement } from './useAnnouncement.ts';

const say = (s: number) => `${s} s`;

async function run(start: number) {
  const remaining = ref(start);
  const scope = effectScope();
  const text = scope.run(() =>
    useAnnouncement(
      () => remaining.value,
      () => say,
    ),
  )!;
  const set = async (value: number) => {
    remaining.value = value;
    await nextTick();
  };
  return { text, set, stop: () => scope.stop() };
}

describe('useAnnouncement', () => {
  it('announces a starting value on the 10 s grid, and stays empty otherwise', async () => {
    const a = await run(90);
    expect(a.text.value).toBe('90 s');
    a.stop();
    const b = await run(87);
    expect(b.text.value).toBe('');
    b.stop();
  });

  it('keeps the last text between announcements', async () => {
    const { text, set, stop } = await run(32);
    const seen = new Set<string>();
    for (let s = 31; s >= 0; s--) {
      await set(s);
      seen.add(text.value);
    }
    expect([...seen]).toEqual([
      '',
      '30 s',
      '20 s',
      '10 s',
      '5 s',
      '4 s',
      '3 s',
      '2 s',
      '1 s',
      '0 s',
    ]);
    stop();
  });

  it('announces added time', async () => {
    const { text, set, stop } = await run(40);
    await set(55);
    expect(text.value).toBe('55 s');
    stop();
  });
});
