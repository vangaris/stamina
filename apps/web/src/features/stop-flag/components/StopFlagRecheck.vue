<script setup lang="ts">
import { ChipGroup } from '@stamina/ui-chip-group';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FieldError, pickedMany, toOptions } from '../../onboarding/index.ts';
import { AREA_QUESTION, BODY_AREAS, QuestionField } from '../../safety/index.ts';
import type { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import type { StopFlagRecheckEmits, StopFlagRecheckProps } from '../types.ts';

defineProps<StopFlagRecheckProps>();
const emit = defineEmits<StopFlagRecheckEmits>();

const { t } = useI18n();
const message = (key: StopFlagMessageKey | undefined) => (key ? t(key) : undefined);
const areaOptions = computed(() =>
  toOptions(BODY_AREAS, (area) => t(`screening.bodyAreas.options.${area}`)),
);
</script>

<template>
  <div class="flex flex-col gap-6 pb-4" data-testid="stop-recheck">
    <p class="text-base text-text-muted">{{ t('stopFlag.recheck.intro') }}</p>
    <template v-for="question in questions" :key="question">
      <QuestionField
        :label="t(`screening.questions.${question}`)"
        unsure
        :answer="draft.answers[question]"
        :error="message(errors.answers[question])"
        @update="emit('answer', question, $event)"
      />
      <div
        v-if="question === AREA_QUESTION && draft.answers[AREA_QUESTION] === true"
        class="flex flex-col gap-2"
      >
        <ChipGroup
          :model-value="draft.bodyAreas"
          :options="areaOptions"
          :label="t('screening.bodyAreas.label')"
          multiple
          @update:model-value="emit('update:bodyAreas', pickedMany($event, BODY_AREAS))"
        />
        <FieldError :message="message(errors.bodyAreas)" />
      </div>
    </template>
  </div>
</template>
