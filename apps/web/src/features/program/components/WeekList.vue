<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ActivityRow } from '../../activity/index.ts';
import type { WeekListProps } from '../types.ts';
import { formatDate } from '../utils/format-date.ts';
import SessionCard from './SessionCard.vue';

defineProps<WeekListProps>();

const { t } = useI18n();
</script>

<template>
  <ol class="flex flex-col gap-4" data-testid="week-list">
    <template v-for="day in days" :key="day.date">
      <li v-if="day.session || activities?.[day.date]" class="flex flex-col gap-2">
        <SessionCard
          v-if="day.session"
          :session="day.session"
          :emphasis="emphasis"
          :locale="locale"
          :progress="progress?.[day.session.id]"
        />
        <p v-else class="px-1 text-sm text-text-muted">{{ formatDate(day.date, locale) }}</p>
        <ul class="flex flex-col gap-2">
          <li v-for="activity in activities?.[day.date] ?? []" :key="activity.key">
            <ActivityRow :activity="activity" />
          </li>
        </ul>
      </li>
      <li
        v-else-if="showFreeDays"
        class="flex items-baseline justify-between px-1 text-sm text-text-muted"
        :data-testid="day.hardActivity ? 'play-day' : 'free-day'"
      >
        <span>{{ formatDate(day.date, locale) }}</span>
        <span>{{ day.hardActivity ? t('week.playDay') : t('week.freeDay') }}</span>
      </li>
    </template>
  </ol>
</template>
