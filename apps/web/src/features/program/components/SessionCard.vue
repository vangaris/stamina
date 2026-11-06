<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { SessionFocus } from '@stamina/domain';
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { RouteName } from '../../../enums/route-name.ts';
import { SessionProgress } from '../enums/session-progress.ts';
import type { SessionCardProps } from '../types.ts';
import { formatDate } from '../utils/format-date.ts';
import { groupSessionBlocks } from '../utils/group-session-blocks.ts';
import { showsPowerSpeedCue } from '../utils/shows-power-speed-cue.ts';
import ExerciseRow from './ExerciseRow.vue';

const props = defineProps<SessionCardProps>();

const { t } = useI18n();
const headingId = useId();

const blocks = computed(() => groupSessionBlocks(props.session));
</script>

<template>
  <Card :as="CardElement.Article" :labelled-by="headingId" data-testid="session-card">
    <div class="flex flex-col gap-4">
      <header class="flex flex-col gap-1">
        <h3 :id="headingId" class="text-base font-semibold">
          {{ formatDate(session.date, locale) }}
        </h3>
        <p class="text-sm text-text-muted">
          {{ t(`program.focus.${session.focus}`) }} ·
          {{ t('program.session.minutes', { minutes: session.minutes }) }}
        </p>
        <p
          v-if="session.focus === SessionFocus.Recovery"
          class="text-sm text-text"
          data-testid="recovery-note"
        >
          {{ t('program.session.recovery') }}
        </p>
      </header>
      <section v-for="block in blocks" :key="block.kind" class="flex flex-col gap-2">
        <h4 class="text-sm font-semibold text-text-muted">
          {{ t(`program.blocks.${block.kind}`) }}
        </h4>
        <p
          v-if="showsPowerSpeedCue(block.kind, emphasis)"
          class="text-sm text-text-muted"
          data-testid="power-speed-cue"
        >
          {{ t('program.session.powerSpeedCue') }}
        </p>
        <ul class="flex flex-col gap-3">
          <ExerciseRow
            v-for="exercise in block.exercises"
            :key="exercise.exerciseId"
            :exercise="exercise"
            :locale="locale"
          />
        </ul>
      </section>
      <footer v-if="progress">
        <p
          v-if="progress === SessionProgress.Done"
          class="text-base font-semibold text-text"
          data-testid="session-done"
        >
          {{ t('program.session.action.done') }}
        </p>
        <RouterLink
          v-else
          v-slot="{ navigate }"
          custom
          :to="{ name: RouteName.SessionDetail, params: { sessionId: session.id } }"
        >
          <Button block :aria-describedby="headingId" data-testid="session-start" @click="navigate">
            {{ t(`program.session.action.${progress}`) }}
          </Button>
        </RouterLink>
      </footer>
    </div>
  </Card>
</template>
