<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card } from '@stamina/ui-card';
import { onMounted, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ROUTE_FOR_EXIT } from '../config.ts';
import { useOnboarding } from '../composables/useOnboarding.ts';
import { OnboardingPhase } from '../enums/onboarding-phase.ts';
import { OnboardingStep } from '../enums/onboarding-step.ts';
import AboutStep from './AboutStep.vue';
import GoalStep from './GoalStep.vue';
import SportStep from './SportStep.vue';
import StopNotice from './StopNotice.vue';
import WeekStep from './WeekStep.vue';

// Lives here, not in config.ts: the step components import config.ts, so a map of them in
// config.ts would be a circular import.
const STEP_COMPONENTS: Record<OnboardingStep, Component> = {
  [OnboardingStep.About]: AboutStep,
  [OnboardingStep.Sport]: SportStep,
  [OnboardingStep.Goal]: GoalStep,
  [OnboardingStep.Week]: WeekStep,
};

const { t } = useI18n();
const router = useRouter();
const {
  phase,
  step,
  draft,
  errors,
  stop,
  errorKey,
  busy,
  stepNumber,
  stepCount,
  load,
  update,
  next,
  back,
  changeAnswers,
} = useOnboarding({ onExit: (exit) => void router.replace(ROUTE_FOR_EXIT[exit]) });

onMounted(load);
</script>

<template>
  <p v-if="phase === OnboardingPhase.Loading" role="status" class="text-text-muted">
    {{ t('onboarding.loading') }}
  </p>
  <Card v-else-if="phase === OnboardingPhase.Failed">
    <div class="flex flex-col gap-4">
      <p role="alert" class="text-base text-text">{{ t('onboarding.loadFailed.message') }}</p>
      <Button block @click="load">{{ t('onboarding.loadFailed.retry') }}</Button>
    </div>
  </Card>
  <StopNotice v-else-if="stop" :reason="stop" @change="changeAnswers" />
  <component
    :is="STEP_COMPONENTS[step]"
    v-else
    :draft="draft"
    :errors="errors"
    :step-number="stepNumber"
    :step-count="stepCount"
    :busy="busy"
    :error-key="errorKey"
    @update="update"
    @next="next"
    @back="back"
  />
</template>
