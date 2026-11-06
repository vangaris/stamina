<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ActivityStatus } from '../enums/activity-status.ts';
import type { ActivityRowProps } from '../types.ts';
import { toSportLabel } from '../utils/to-sport-label.ts';

defineProps<ActivityRowProps>();

const { t } = useI18n();
</script>

<template>
  <div
    class="flex flex-col gap-1 rounded-md border border-border px-3 py-2"
    :data-testid="activity.status === ActivityStatus.Done ? 'activity-done' : 'activity-planned'"
  >
    <p class="text-base font-semibold text-text">{{ toSportLabel(activity.sport, t) }}</p>
    <p class="text-sm text-text-muted">
      {{
        t('activity.row.details', {
          minutes: activity.minutes,
          effort: t(`activity.played.effort.options.${activity.intensity}`),
        })
      }}
    </p>
    <p class="text-sm text-text">
      {{ t(`activity.status.${activity.status}`) }}
      <template v-if="activity.load !== undefined">
        ·
        <span data-testid="activity-load">{{
          t('activity.row.load', { load: activity.load })
        }}</span>
      </template>
    </p>
  </div>
</template>
