<script setup lang="ts">
import { Card, CardElement } from '@stamina/ui-card';
import { ProgressBar, ProgressBarTone } from '@stamina/ui-progress-bar';
import { useId } from 'vue';
import type { ProgressCountProps } from '../types.ts';

defineProps<ProgressCountProps>();

const headingId = useId();
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId">
    <div class="flex flex-col gap-2">
      <h2 :id="headingId" class="text-base font-semibold">{{ label }}</h2>
      <ProgressBar
        v-if="planned > 0"
        :value="done"
        :max="Math.max(planned, done)"
        :label="label"
        :value-text="valueText"
        :tone="ProgressBarTone.Accent"
      />
      <p class="text-sm text-text-muted">{{ valueText }}</p>
    </div>
  </Card>
</template>
