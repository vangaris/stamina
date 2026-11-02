<script setup lang="ts">
import { Card, CardElement } from '@stamina/ui-card';
import { onMounted, ref, useId } from 'vue';
import type { ScreenFrameProps } from '../types.ts';

defineProps<ScreenFrameProps>();

const headingId = useId();
const heading = ref<HTMLElement | null>(null);

// A new screen replaced the old one: move the keyboard and the screen reader to its heading.
onMounted(() => heading.value?.focus());
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId">
    <div class="flex flex-col gap-6">
      <h1 :id="headingId" ref="heading" tabindex="-1" class="text-xl font-semibold outline-none">
        {{ title }}
      </h1>
      <slot />
    </div>
  </Card>
</template>
