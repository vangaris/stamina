<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { BlockSummaryProps } from '../types.ts';

defineProps<BlockSummaryProps>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-2" data-testid="block-summary">
    <h2 class="text-lg font-semibold">{{ t(`program.block.name.${block.emphasis}`) }}</h2>
    <p class="text-sm text-text-muted">
      {{ t('program.block.week', { week: block.weekInBlock }) }}
    </p>
    <p class="text-base text-text">{{ t(`program.block.line.${block.emphasis}`) }}</p>
    <p v-if="block.limited" class="rounded-md bg-surface-muted p-3 text-base text-text">
      {{ t('program.block.limited') }}
    </p>
    <p v-if="block.beta" class="rounded-md bg-surface-muted p-3 text-base text-text">
      {{ t('program.block.beta') }}
    </p>
    <p class="text-sm text-text-muted">{{ t('program.block.equipment') }}</p>
  </div>
</template>
