import { ref, watch, type Ref } from 'vue';

export interface ImageFailure {
  failed: Ref<boolean>;
  /** Wire to the image's `error` event. */
  onError(): void;
}

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
