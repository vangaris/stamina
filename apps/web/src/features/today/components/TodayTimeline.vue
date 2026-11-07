<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { TimelineEntryKind } from '../enums/timeline-entry-kind.ts';
import type { TodayTimelineProps } from '../types.ts';
import { formatTime } from '../utils/format-time.ts';
import TimelineActivityEntry from './TimelineActivityEntry.vue';
import TimelineMealEntry from './TimelineMealEntry.vue';
import TimelineSessionEntry from './TimelineSessionEntry.vue';
import TimelineWaterEntry from './TimelineWaterEntry.vue';
import TimelineWindDownEntry from './TimelineWindDownEntry.vue';

defineProps<TodayTimelineProps>();

const { t } = useI18n();
</script>

<template>
  <ol class="flex flex-col gap-3" :aria-label="t('today.timeline.label')" data-testid="timeline">
    <li
      v-for="entry in entries"
      :key="entry.key"
      class="flex items-start gap-3"
      data-testid="timeline-entry"
      :data-kind="entry.kind"
    >
      <span class="w-12 shrink-0 pt-2 text-sm tabular-nums text-text-muted">
        <template v-if="entry.at !== undefined">{{ formatTime(entry.at, locale) }}</template>
      </span>
      <TimelineSessionEntry
        v-if="entry.kind === TimelineEntryKind.Session"
        :session="entry.session"
      />
      <TimelineActivityEntry
        v-else-if="entry.kind === TimelineEntryKind.Activity"
        :activity="entry.activity"
      />
      <TimelineWaterEntry v-else-if="entry.kind === TimelineEntryKind.Water" :water="entry.water" />
      <TimelineMealEntry v-else-if="entry.kind === TimelineEntryKind.MealSlot" :meal="entry.meal" />
      <TimelineWindDownEntry v-else />
    </li>
  </ol>
</template>
