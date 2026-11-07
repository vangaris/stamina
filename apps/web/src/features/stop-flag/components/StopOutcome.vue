<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { StopOutcomeProps } from '../types.ts';

defineProps<StopOutcomeProps>();

const { t } = useI18n();
</script>

<template>
  <section class="flex flex-col gap-2" :data-testid="`stop-outcome-${outcome.kind}`">
    <h2 v-if="showTitle" class="text-lg font-semibold text-text">
      {{ t(`stopFlag.outcome.${outcome.kind}.title`) }}
    </h2>
    <p
      v-if="outcome.emergencyNumber"
      class="text-lg font-semibold text-text"
      data-testid="stop-emergency"
    >
      {{ t('stopFlag.outcome.emergency', { number: outcome.emergencyNumber }) }}
    </p>
    <p class="text-base text-text">
      {{
        t(`stopFlag.outcome.${outcome.kind}.body`, {
          area: outcome.area ? t(`screening.bodyAreas.options.${outcome.area}`) : '',
        })
      }}
    </p>
  </section>
</template>
