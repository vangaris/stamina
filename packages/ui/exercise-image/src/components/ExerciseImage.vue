<script setup lang="ts">
import {
  ATTRIBUTION_LINK_CLASSES,
  ATTRIBUTION_LINK_REL,
  ATTRIBUTION_LINK_TARGET,
  EXERCISE_IMAGE_BOX_CLASSES,
} from '../config.ts';
import { useImageFailure } from '../composables/useImageFailure.ts';
import type { ExerciseImageProps } from '../types.ts';

const props = withDefaults(defineProps<ExerciseImageProps>(), { authorUrl: null });
const { failed, onError } = useImageFailure(() => props.src);
</script>

<template>
  <figure class="m-0 flex flex-col gap-2">
    <div :class="EXERCISE_IMAGE_BOX_CLASSES">
      <img
        v-if="!failed"
        :src="src"
        :alt="alt"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        class="size-full object-contain"
        @error="onError"
      />
      <p
        v-else
        class="m-0 flex size-full items-center justify-center p-4 text-center text-sm text-text-muted"
      >
        {{ unavailableLabel }}
      </p>
    </div>
    <figcaption class="flex flex-wrap items-center gap-x-3 text-sm text-text-muted">
      <span class="inline-flex items-center gap-1">
        {{ authorLabel }}
        <a
          v-if="authorUrl"
          :href="authorUrl"
          :target="ATTRIBUTION_LINK_TARGET"
          :rel="ATTRIBUTION_LINK_REL"
          :class="ATTRIBUTION_LINK_CLASSES"
          >{{ author }}<span class="sr-only"> ({{ newTabLabel }})</span></a
        >
        <span v-else>{{ author }}</span>
      </span>
      <a
        :href="licenceUrl"
        :target="ATTRIBUTION_LINK_TARGET"
        :rel="ATTRIBUTION_LINK_REL"
        :class="ATTRIBUTION_LINK_CLASSES"
        >{{ licence }}<span class="sr-only"> ({{ newTabLabel }})</span></a
      >
      <a
        :href="sourceUrl"
        :target="ATTRIBUTION_LINK_TARGET"
        :rel="ATTRIBUTION_LINK_REL"
        :class="ATTRIBUTION_LINK_CLASSES"
        >{{ sourceLabel }}<span class="sr-only"> ({{ newTabLabel }})</span></a
      >
    </figcaption>
  </figure>
</template>
