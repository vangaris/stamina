<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { RouteName } from '../../../enums/route-name.ts';
import { SessionProgress } from '../../program/index.ts';
import type { TimelineSessionEntryProps } from '../types.ts';

defineProps<TimelineSessionEntryProps>();

const { t } = useI18n();
const headingId = useId();
</script>

<template>
  <Card :as="CardElement.Article" :labelled-by="headingId" class="flex-1">
    <div class="flex flex-col gap-3">
      <header class="flex flex-col gap-1">
        <h2 :id="headingId" class="text-base font-semibold">
          {{ t(`program.focus.${session.focus}`) }}
        </h2>
        <p class="text-sm text-text-muted">
          {{ t('program.session.minutes', { minutes: session.minutes }) }}
        </p>
      </header>
      <p
        v-if="session.progress === SessionProgress.Done"
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
          {{ t(`program.session.action.${session.progress}`) }}
        </Button>
      </RouterLink>
    </div>
  </Card>
</template>
