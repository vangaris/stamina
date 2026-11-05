<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { computed, onMounted, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { i18n } from '../../../i18n.ts';
import { useReveal } from '../composables/useReveal.ts';
import { ProgramPhase } from '../enums/program-phase.ts';
import { buildWeekDays } from '../utils/build-week-days.ts';
import BlockSummary from './BlockSummary.vue';
import ProgramGate from './ProgramGate.vue';
import WeekList from './WeekList.vue';

const { t } = useI18n();
const { locale } = i18n.global;
const router = useRouter();
const headingId = useId();
const { phase, program, messageKey, load, continueOn } = useReveal({
  onNavigate: (path) => void router.replace(path),
});

const days = computed(() => (program.value ? buildWeekDays(program.value) : []));

onMounted(load);
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="phase === ProgramPhase.Ready && program">
      <Card :as="CardElement.Section" :labelled-by="headingId">
        <div class="flex flex-col gap-4">
          <h1 :id="headingId" class="text-xl font-semibold">{{ t('program.reveal.title') }}</h1>
          <BlockSummary :block="program.block" />
        </div>
      </Card>
      <WeekList :days="days" :locale="locale" :show-free-days="false" />
      <Button block data-testid="reveal-continue" @click="continueOn">
        {{ t('program.reveal.continue') }}
      </Button>
    </template>
    <Card v-else-if="phase === ProgramPhase.Unavailable">
      <div class="flex flex-col gap-4">
        <h1 class="text-xl font-semibold">{{ t('program.unavailable.title') }}</h1>
        <p class="text-base text-text" data-testid="reveal-unavailable">
          {{ messageKey ? t(messageKey) : '' }}
        </p>
        <Button block @click="continueOn">{{ t('program.reveal.continue') }}</Button>
      </div>
    </Card>
    <ProgramGate v-else :phase="phase" :message-key="messageKey" @retry="load" />
  </div>
</template>
