<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { TimelineMealEntryProps } from '../types.ts';

defineProps<TimelineMealEntryProps>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-1 flex-col gap-1 rounded-md border border-border px-3 py-2">
    <p class="text-base font-semibold text-text">{{ t(`today.meal.slot.${meal.slot}`) }}</p>
    <p v-if="meal.title" class="text-sm text-text-muted" data-testid="meal-title">
      {{ meal.title }}
    </p>
  </div>
</template>
