<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { formatLoad } from '../../activity/index.ts';
import { formatDate } from '../../program/index.ts';
import type { TodayHeaderProps } from '../types.ts';

defineProps<TodayHeaderProps>();

const { t } = useI18n();
</script>

<template>
  <header class="flex flex-col gap-1">
    <h1 class="text-xl font-semibold">{{ t('nav.today') }}</h1>
    <p class="text-base text-text" data-testid="today-date">{{ formatDate(date, locale) }}</p>
    <p v-if="summary" class="text-base font-semibold text-text" data-testid="today-load">
      <span data-testid="today-load-this-week">
        {{ t('today.header.load', { load: formatLoad(summary.load, locale) }) }}
      </span>
      <template v-if="summary.average !== null">
        ·
        <span data-testid="today-load-usual">
          {{ t('today.header.usual', { average: formatLoad(summary.average, locale) }) }}
        </span>
      </template>
    </p>
  </header>
</template>
