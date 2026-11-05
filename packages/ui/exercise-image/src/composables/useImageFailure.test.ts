import { nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useImageFailure } from './useImageFailure.ts';

describe('useImageFailure', () => {
  it('starts without a failure and records one on error', () => {
    const { failed, onError } = useImageFailure(() => 'a.png');
    expect(failed.value).toBe(false);
    onError();
    expect(failed.value).toBe(true);
  });

  it('forgets the failure when the source changes, not otherwise', async () => {
    const src = ref('a.png');
    const { failed, onError } = useImageFailure(() => src.value);
    onError();
    src.value = 'a.png';
    await nextTick();
    expect(failed.value).toBe(true);
    src.value = 'b.png';
    await nextTick();
    expect(failed.value).toBe(false);
  });
});
