<script setup lang="ts">
import { MAX_CHECKIN_SCORE } from '@stamina/domain';
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { CHECKIN_QUESTIONS } from '../config.ts';
import type { CheckinDoneEmits, CheckinDoneProps } from '../types.ts';

defineProps<CheckinDoneProps>();
const emit = defineEmits<CheckinDoneEmits>();

const { t } = useI18n();
const headingId = useId();
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="checkin-done">
    <div class="flex flex-col gap-3">
      <h2 :id="headingId" class="text-xl font-semibold">{{ t('checkin.done.title') }}</h2>
      <p v-if="messageKey" role="status" class="text-base text-text" data-testid="checkin-notice">
        {{ t(messageKey) }}
      </p>
      <dl class="flex flex-wrap gap-x-6 gap-y-1 text-base" data-testid="checkin-answers">
        <div v-for="question in CHECKIN_QUESTIONS" :key="question" class="flex gap-2">
          <dt class="text-text-muted">{{ t(`checkin.${question}.name`) }}</dt>
          <dd class="font-medium tabular-nums">
            {{ t('checkin.done.score', { score: answers[question], max: MAX_CHECKIN_SCORE }) }}
          </dd>
        </div>
      </dl>
    </div>
    <template #footer>
      <p v-if="unusualDone" class="text-base text-text" data-testid="unusual-done">
        {{ t('checkin.unusual.done') }}
      </p>
      <div v-else class="flex flex-col gap-3" data-testid="unusual-row">
        <h3 class="text-base font-semibold">{{ t('checkin.unusual.title') }}</h3>
        <div class="flex flex-col gap-2 sm:flex-row">
          <Button
            :variant="ButtonVariant.Secondary"
            data-testid="unusual-none"
            @click="emit('nothing-unusual')"
          >
            {{ t('checkin.unusual.none') }}
          </Button>
          <Button
            :variant="ButtonVariant.Secondary"
            data-testid="unusual-something"
            @click="emit('something-unusual')"
          >
            {{ t('checkin.unusual.something') }}
          </Button>
        </div>
      </div>
    </template>
  </Card>
</template>
