<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card } from '@stamina/ui-card';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { RoutePath } from '../../../enums/route-path.ts';
import { i18n } from '../../../i18n.ts';
import { useWeekView } from '../composables/useWeekView.ts';
import { ProgramPhase } from '../enums/program-phase.ts';
import BlockSummary from './BlockSummary.vue';
import ProgramGate from './ProgramGate.vue';
import WeekList from './WeekList.vue';

const { t } = useI18n();
const { locale } = i18n.global;
const router = useRouter();
const { phase, program, messageKey, days, load } = useWeekView({
  onNavigate: (path) => void router.replace(path),
});

onMounted(load);
</script>

<template>
  <section class="flex flex-col gap-6">
    <h1 class="text-xl font-semibold">{{ t('week.title') }}</h1>
    <template v-if="phase === ProgramPhase.Ready && program">
      <BlockSummary :block="program.block" />
      <WeekList :days="days" :locale="locale" :show-free-days="true" />
    </template>
    <Card v-else-if="phase === ProgramPhase.Unavailable">
      <p class="text-base text-text" data-testid="week-empty">
        {{ messageKey ? t(messageKey) : '' }}
      </p>
    </Card>
    <ProgramGate v-else :phase="phase" :message-key="messageKey" @retry="load" />
    <Button block @click="router.push(RoutePath.Today)">{{ t('week.backToToday') }}</Button>
  </section>
</template>
