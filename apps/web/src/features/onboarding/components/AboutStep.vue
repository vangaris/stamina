<script setup lang="ts">
import { ChipGroup } from '@stamina/ui-chip-group';
import { Select } from '@stamina/ui-select';
import { TextField, TextFieldInputmode } from '@stamina/ui-text-field';
import { Need, Units } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  BIRTH_YEAR_AUTOCOMPLETE,
  BIRTH_YEAR_LENGTH,
  COUNTRY_AUTOCOMPLETE,
  LOCALE_NAMES,
} from '../config.ts';
import type { OnboardingDraft, StepEmits, StepProps } from '../types.ts';
import { countryOptions } from '../utils/country-options.ts';
import { pickedOne, pickedOneOr } from '../utils/picked-value.ts';
import { toOptions } from '../utils/to-options.ts';
import FieldError from './FieldError.vue';
import StepFrame from './StepFrame.vue';

const props = defineProps<StepProps>();
const emit = defineEmits<StepEmits>();

const { t } = useI18n();
const message = (field: keyof OnboardingDraft) => {
  const key = props.errors[field];
  return key ? t(key) : undefined;
};

const needsOptions = computed(() =>
  toOptions(Object.values(Need), (need) => t(`onboarding.about.needs.options.${need}`)),
);
const countries = computed(() => countryOptions(props.draft.locale));
const localeOptions = toOptions(Object.values(Locale), (locale) => LOCALE_NAMES[locale]);
const unitsOptions = computed(() =>
  toOptions(Object.values(Units), (units) => t(`onboarding.about.units.options.${units}`)),
);
</script>

<template>
  <StepFrame
    :title="t('onboarding.about.title')"
    :step-number="stepNumber"
    :step-count="stepCount"
    :busy="busy"
    :error-key="errorKey"
    @next="emit('next')"
    @back="emit('back')"
  >
    <div class="flex flex-col gap-2">
      <ChipGroup
        :model-value="draft.needs ?? null"
        :options="needsOptions"
        :label="t('onboarding.about.needs.label')"
        @update:model-value="emit('update', { field: 'needs', value: pickedOne<Need>($event) })"
      />
      <FieldError :message="message('needs')" />
    </div>
    <TextField
      :model-value="draft.birthYear"
      :label="t('onboarding.about.birthYear.label')"
      :hint="t('onboarding.about.birthYear.hint')"
      :error="message('birthYear')"
      :inputmode="TextFieldInputmode.Numeric"
      :autocomplete="BIRTH_YEAR_AUTOCOMPLETE"
      :maxlength="BIRTH_YEAR_LENGTH"
      required
      @update:model-value="emit('update', { field: 'birthYear', value: $event })"
    />
    <Select
      :model-value="draft.country"
      :label="t('onboarding.about.country.label')"
      :placeholder="t('onboarding.about.country.placeholder')"
      :options="countries"
      :error="message('country')"
      :autocomplete="COUNTRY_AUTOCOMPLETE"
      required
      @update:model-value="emit('update', { field: 'country', value: $event })"
    />
    <ChipGroup
      :model-value="draft.locale"
      :options="localeOptions"
      :label="t('onboarding.about.language.label')"
      @update:model-value="
        emit('update', { field: 'locale', value: pickedOneOr<Locale>($event, draft.locale) })
      "
    />
    <ChipGroup
      :model-value="draft.units"
      :options="unitsOptions"
      :label="t('onboarding.about.units.label')"
      @update:model-value="
        emit('update', { field: 'units', value: pickedOneOr<Units>($event, draft.units) })
      "
    />
  </StepFrame>
</template>
