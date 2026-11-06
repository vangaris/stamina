<script setup lang="ts">
import { Card, CardTone } from '@stamina/ui-card';
import { useI18n } from 'vue-i18n';
import type { LoadSummaryProps } from '../types.ts';
import { formatLoad } from '../utils/format-load.ts';

defineProps<LoadSummaryProps>();

const { t } = useI18n();
</script>

<template>
  <Card :tone="CardTone.Load" data-testid="load-summary">
    <div class="flex flex-col gap-1">
      <p class="text-base font-semibold text-text">
        <span data-testid="load-this-week">
          {{ t('activity.summary.thisWeek', { load: formatLoad(summary.load, locale) }) }}
        </span>
        <template v-if="summary.average !== null">
          ·
          <span data-testid="load-average">
            {{ t('activity.summary.usual', { average: formatLoad(summary.average, locale) }) }}
          </span>
        </template>
      </p>
      <p
        v-if="summary.average === null"
        class="text-sm text-text-muted"
        data-testid="load-no-usual"
      >
        {{ t('activity.summary.noUsual') }}
      </p>
    </div>
  </Card>
</template>
