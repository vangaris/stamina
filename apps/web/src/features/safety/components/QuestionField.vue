<script setup lang="ts">
import { ChipGroup } from '@stamina/ui-chip-group';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FieldError, toOptions } from '../../onboarding/index.ts';
import { YesNo } from '../enums/yes-no.ts';
import type { QuestionFieldEmits, QuestionFieldProps } from '../types.ts';
import { fromYesNo } from '../utils/from-yes-no.ts';
import { toYesNo } from '../utils/to-yes-no.ts';

defineProps<QuestionFieldProps>();
const emit = defineEmits<QuestionFieldEmits>();

const { t } = useI18n();
const options = computed(() =>
  toOptions(Object.values(YesNo), (choice) =>
    t(choice === YesNo.Yes ? 'screening.yes' : 'screening.no'),
  ),
);

function pick(model: Parameters<typeof fromYesNo>[0]) {
  const answer = fromYesNo(model);
  if (answer !== undefined) emit('update', answer);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <ChipGroup
      :model-value="toYesNo(answer)"
      :options="options"
      :label="label"
      @update:model-value="pick"
    />
    <p v-if="unsure" class="text-sm text-text-muted">{{ t('screening.unsure') }}</p>
    <FieldError :message="error" />
  </div>
</template>
