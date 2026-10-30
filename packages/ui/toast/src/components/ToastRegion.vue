<script setup lang="ts">
import { computed } from 'vue';
import { TOAST_REGION_PLACEMENT_CLASSES } from '../config.ts';
import type { ToastRegionProps } from '../types.ts';
import { partitionToasts } from '../utils/partition-toasts.ts';
import Toast from './Toast.vue';

const props = withDefaults(defineProps<ToastRegionProps>(), { position: 'fixed' });

const emit = defineEmits<{ dismiss: [id: string]; action: [id: string] }>();

// Two persistent live regions: polite for routine feedback, assertive for errors. They stay in
// the DOM when empty because screen readers only announce changes inside a region they already
// know about.
const regions = computed(() => {
  const { status, alert } = partitionToasts(props.toasts);
  return [
    { role: 'status', live: 'polite', toasts: status },
    { role: 'alert', live: undefined, toasts: alert },
  ];
});

const placement = computed(() => TOAST_REGION_PLACEMENT_CLASSES[props.position]);
</script>

<template>
  <div
    class="pointer-events-none inset-x-0 bottom-0 z-50 flex flex-col items-center px-4"
    :class="placement"
  >
    <TransitionGroup
      v-for="region in regions"
      :key="region.role"
      tag="div"
      :role="region.role"
      :aria-live="region.live"
      class="flex w-full max-w-md flex-col"
      enter-active-class="transition"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition"
      leave-to-class="opacity-0"
    >
      <Toast
        v-for="toast in region.toasts"
        :key="toast.id"
        :message="toast.message"
        :tone="toast.tone ?? 'info'"
        :action-label="toast.actionLabel"
        :duration-ms="toast.durationMs"
        :dismiss-label="dismissLabel"
        @dismiss="emit('dismiss', toast.id)"
        @action="emit('action', toast.id)"
      />
    </TransitionGroup>
  </div>
</template>
