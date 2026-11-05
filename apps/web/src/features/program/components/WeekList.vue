<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { WeekListProps } from '../types.ts';
import { formatDate } from '../utils/format-date.ts';
import SessionCard from './SessionCard.vue';

defineProps<WeekListProps>();

const { t } = useI18n();
</script>

<template>
  <ol class="flex flex-col gap-4" data-testid="week-list">
    <template v-for="day in days" :key="day.date">
      <li v-if="day.session">
        <SessionCard :session="day.session" :locale="locale" />
      </li>
      <li
        v-else-if="showFreeDays"
        class="flex items-baseline justify-between px-1 text-sm text-text-muted"
        data-testid="free-day"
      >
        <span>{{ formatDate(day.date, locale) }}</span>
        <span>{{ t('week.freeDay') }}</span>
      </li>
    </template>
  </ol>
</template>
