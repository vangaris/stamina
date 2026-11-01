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
import { useFieldMessages } from '../composables/useFieldMessages.ts';
import type { StepEmits, StepProps } from '../types.ts';
import { countryOptions } from '../utils/country-options.ts';
import { pickedOne } from '../utils/picked-one.ts';
import { toOptions } from '../utils/to-options.ts';
import FieldError from './FieldError.vue';
import StepFrame from './StepFrame.vue';

const props = defineProps<StepProps>();
const emit = defineEmits<StepEmits>();

const { t } = useI18n();
const message = useFieldMessages(() => props.errors);

const NEEDS = Object.values(Need);
const LOCALES = Object.values(Locale);
const UNITS = Object.values(Units);

const needsOptions = computed(() =>
  toOptions(NEEDS, (need) => t(`onboarding.about.needs.options.${need}`)),
);
const countries = computed(() => countryOptions(props.draft.locale));
const localeOptions = toOptions(LOCALES, (locale) => LOCALE_NAMES[locale]);
const unitsOptions = computed(() =>
  toOptions(UNITS, (units) => t(`onboarding.about.units.options.${units}`)),
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
        @update:model-value="emit('update', { field: 'needs', value: pickedOne($event, NEEDS) })"
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
        emit('update', { field: 'locale', value: pickedOne($event, LOCALES) ?? draft.locale })
      "
    />
    <ChipGroup
      :model-value="draft.units"
      :options="unitsOptions"
      :label="t('onboarding.about.units.label')"
      @update:model-value="
        emit('update', { field: 'units', value: pickedOne($event, UNITS) ?? draft.units })
      "
    />
  </StepFrame>
</template>
