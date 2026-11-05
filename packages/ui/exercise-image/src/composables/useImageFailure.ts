import { ref, watch } from 'vue';
import type { ImageFailure } from '../types.ts';

/** Whether the image at `src` failed to load; a new `src` gets a fresh try. */
export function useImageFailure(src: () => string): ImageFailure {
  const failed = ref(false);
  watch(src, () => {
    failed.value = false;
  });
  return {
    failed,
    onError: () => {
      failed.value = true;
    },
  };
}
