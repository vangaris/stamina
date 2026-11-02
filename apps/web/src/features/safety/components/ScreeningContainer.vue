<script setup lang="ts">
import { Button, ButtonType } from '@stamina/ui-button';
import { ChipGroup } from '@stamina/ui-chip-group';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { FieldError, pickedMany, toOptions } from '../../onboarding/index.ts';
import { AREA_QUESTION, BODY_AREAS, FIELD_ID_PREFIX, QUESTIONS } from '../config.ts';
import type { ScreeningFieldKey } from '../types.ts';
import { useScreening } from '../composables/useScreening.ts';
import { SafetyPhase } from '../enums/safety-phase.ts';
import { ScreeningField } from '../enums/screening-field.ts';
import { ScreeningView } from '../enums/screening-view.ts';
import QuestionField from './QuestionField.vue';
import SafetyGate from './SafetyGate.vue';
import ScreenFrame from './ScreenFrame.vue';
import ScreeningOutcome from './ScreeningOutcome.vue';

const { t } = useI18n();
const router = useRouter();
const {
  phase,
  view,
  draft,
  errors,
  errorKey,
  outcome,
  busy,
  load,
  answer,
  setBodyAreas,
  setTrainedRegularly,
  submit,
  finish,
} = useScreening({ onNavigate: (path) => void router.replace(path) });

const message = (field: ScreeningFieldKey) => {
  const key = errors.value[field];
  return key ? t(key) : undefined;
};
const error = computed(() => (errorKey.value ? t(errorKey.value) : undefined));
const areaOptions = computed(() =>
  toOptions(BODY_AREAS, (area) => t(`screening.bodyAreas.options.${area}`)),
);

onMounted(load);
</script>

<template>
  <template v-if="phase === SafetyPhase.Ready">
    <ScreeningOutcome
      v-if="view === ScreeningView.Outcome && outcome"
      :outcome="outcome"
      @continue="finish"
    />
    <ScreenFrame v-else :title="t('screening.title')">
      <form class="flex flex-col gap-6" novalidate @submit.prevent="submit">
        <p class="text-base text-text-muted">{{ t('screening.intro') }}</p>
        <template v-for="question in QUESTIONS" :key="question">
          <div :id="FIELD_ID_PREFIX + question" tabindex="-1" class="outline-none">
            <QuestionField
              :label="t(`screening.questions.${question}`)"
              unsure
              :answer="draft.answers[question]"
              :error="message(question)"
              @update="answer(question, $event)"
            />
          </div>
          <div
            v-if="question === AREA_QUESTION && draft.answers[AREA_QUESTION] === true"
            :id="FIELD_ID_PREFIX + ScreeningField.BodyAreas"
            tabindex="-1"
            class="flex flex-col gap-2 outline-none"
          >
            <ChipGroup
              :model-value="draft.bodyAreas"
              :options="areaOptions"
              :label="t('screening.bodyAreas.label')"
              multiple
              @update:model-value="setBodyAreas(pickedMany($event, BODY_AREAS))"
            />
            <FieldError :message="message(ScreeningField.BodyAreas)" />
          </div>
        </template>
        <div
          :id="FIELD_ID_PREFIX + ScreeningField.StartingLevel"
          tabindex="-1"
          class="outline-none"
        >
          <QuestionField
            :label="t('screening.startingLevel.question')"
            :unsure="false"
            :answer="draft.trainedRegularly"
            :error="message(ScreeningField.StartingLevel)"
            @update="setTrainedRegularly"
          />
        </div>
        <FieldError :message="error" />
        <Button :type="ButtonType.Submit" :disabled="busy" block>
          {{ t('screening.actions.submit') }}
        </Button>
      </form>
    </ScreenFrame>
  </template>
  <SafetyGate v-else :phase="phase" @retry="load" />
</template>
