<script setup lang="ts">
import { Button, ButtonType, ButtonVariant } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { ChipGroup } from '@stamina/ui-chip-group';
import { TextField, TextFieldInputmode } from '@stamina/ui-text-field';
import {
  MAX_BODY_WEIGHT_KG,
  MAX_DISLIKE_LENGTH,
  MAX_DISLIKES,
  MAX_HEIGHT_CM,
  MIN_BODY_WEIGHT_KG,
  MIN_HEIGHT_CM,
} from '@stamina/domain';
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { FieldError, pickedMany, pickedOne, toOptions } from '../../onboarding/index.ts';
import {
  ALLERGEN_OPTIONS,
  BODY_DIRECTION_OPTIONS,
  COOKING_EFFORT_OPTIONS,
  EATING_PATTERN_OPTIONS,
  EVERYDAY_ACTIVITY_OPTIONS,
  MEALS_PER_DAY_OPTIONS,
  SEX_OPTIONS,
} from '../config.ts';
import { UnlockField } from '../enums/unlock-field.ts';
import { DISLIKE_INPUT_ID, unlockFieldId } from '../utils/focus-unlock-field.ts';
import { UnlockStatus } from '../enums/unlock-status.ts';
import type { UnlockDraft, UnlockMealsFormEmits, UnlockMealsFormProps } from '../types.ts';

const props = defineProps<UnlockMealsFormProps>();
const emit = defineEmits<UnlockMealsFormEmits>();
const draft = defineModel<UnlockDraft>('draft', { required: true });

const { t } = useI18n();
const headingId = useId();
const heightLimits = { min: MIN_HEIGHT_CM, max: MAX_HEIGHT_CM };
const weightLimits = { min: MIN_BODY_WEIGHT_KG, max: MAX_BODY_WEIGHT_KG };

const options = computed(() => ({
  sex: toOptions(SEX_OPTIONS, (value) => t(`meals.unlock.sex.options.${value}`)),
  everydayActivity: toOptions(EVERYDAY_ACTIVITY_OPTIONS, (value) =>
    t(`meals.unlock.everyday.options.${value}`),
  ),
  eatingPattern: toOptions(EATING_PATTERN_OPTIONS, (value) =>
    t(`meals.unlock.eating.options.${value}`),
  ),
  allergens: toOptions(ALLERGEN_OPTIONS, (value) => t(`meals.unlock.allergens.options.${value}`)),
  mealsPerDay: toOptions(MEALS_PER_DAY_OPTIONS, (value) => String(value)),
  cookingEffort: toOptions(COOKING_EFFORT_OPTIONS, (value) =>
    t(`meals.unlock.cooking.options.${value}`),
  ),
  bodyDirection: toOptions(BODY_DIRECTION_OPTIONS, (value) =>
    t(`meals.unlock.direction.options.${value}`),
  ),
}));

const errorFor = (field: UnlockField) =>
  props.missing.includes(field)
    ? t(`meals.unlock.errors.${field}`, field === UnlockField.Height ? heightLimits : weightLimits)
    : undefined;
const dislikesFull = computed(() => draft.value.dislikes.length >= MAX_DISLIKES);
const saving = computed(() => props.status === UnlockStatus.Saving);
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="unlock-meals">
    <form class="flex flex-col gap-4" novalidate @submit.prevent="emit('submit')">
      <div class="flex flex-col gap-1">
        <h2 :id="headingId" class="text-base font-semibold">{{ t('meals.unlock.title') }}</h2>
        <p class="text-sm text-text-muted">{{ t('meals.unlock.intro') }}</p>
      </div>

      <div :id="unlockFieldId(UnlockField.Sex)" class="flex flex-col gap-2">
        <ChipGroup
          :model-value="draft.sex"
          :options="options.sex"
          :label="t('meals.unlock.sex.label')"
          @update:model-value="draft.sex = pickedOne($event, SEX_OPTIONS) ?? null"
        />
        <p class="text-sm text-text-muted">{{ t('meals.unlock.sex.hint') }}</p>
        <FieldError :message="errorFor(UnlockField.Sex)" />
      </div>

      <TextField
        :id="unlockFieldId(UnlockField.Height)"
        v-model="draft.height"
        :label="t('meals.unlock.height.label')"
        :inputmode="TextFieldInputmode.Numeric"
        :hint="t('meals.unlock.height.hint', heightLimits)"
        :error="errorFor(UnlockField.Height)"
        required
        autocomplete="off"
        data-testid="unlock-height"
      >
        <template #suffix>{{ t('meals.unlock.height.unit') }}</template>
      </TextField>

      <TextField
        :id="unlockFieldId(UnlockField.Weight)"
        v-model="draft.weight"
        :label="t('meals.unlock.weight.label')"
        :inputmode="TextFieldInputmode.Decimal"
        :hint="t('meals.unlock.weight.hint', weightLimits)"
        :error="errorFor(UnlockField.Weight)"
        required
        autocomplete="off"
        data-testid="unlock-weight"
      >
        <template #suffix>{{ t('meals.unlock.weight.unit') }}</template>
      </TextField>

      <div :id="unlockFieldId(UnlockField.EverydayActivity)" class="flex flex-col gap-2">
        <ChipGroup
          :model-value="draft.everydayActivity"
          :options="options.everydayActivity"
          :label="t('meals.unlock.everyday.label')"
          @update:model-value="
            draft.everydayActivity = pickedOne($event, EVERYDAY_ACTIVITY_OPTIONS) ?? null
          "
        />
        <FieldError :message="errorFor(UnlockField.EverydayActivity)" />
      </div>

      <div
        v-if="askDirection"
        :id="unlockFieldId(UnlockField.BodyDirection)"
        class="flex flex-col gap-2"
        data-testid="unlock-direction"
      >
        <ChipGroup
          :model-value="draft.bodyDirection"
          :options="options.bodyDirection"
          :label="t('meals.unlock.direction.label')"
          @update:model-value="
            draft.bodyDirection = pickedOne($event, BODY_DIRECTION_OPTIONS) ?? null
          "
        />
        <FieldError :message="errorFor(UnlockField.BodyDirection)" />
      </div>

      <ChipGroup
        :model-value="draft.eatingPattern"
        :options="options.eatingPattern"
        :label="t('meals.unlock.eating.label')"
        @update:model-value="
          draft.eatingPattern = pickedOne($event, EATING_PATTERN_OPTIONS) ?? draft.eatingPattern
        "
      />

      <div class="flex flex-col gap-2">
        <ChipGroup
          :model-value="draft.allergens"
          :options="options.allergens"
          :label="t('meals.unlock.allergens.label')"
          multiple
          @update:model-value="draft.allergens = pickedMany($event, ALLERGEN_OPTIONS)"
        />
        <p class="text-sm text-text-muted">{{ t('meals.unlock.allergens.hint') }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <TextField
          :id="DISLIKE_INPUT_ID"
          v-model="draft.dislikeText"
          :label="t('meals.unlock.dislikes.label')"
          :hint="t('meals.unlock.dislikes.hint', { max: MAX_DISLIKES })"
          :maxlength="MAX_DISLIKE_LENGTH"
          :readonly="dislikesFull"
          :aria-disabled="dislikesFull ? 'true' : undefined"
          autocomplete="off"
          data-testid="unlock-dislike"
          @keydown.enter.prevent="emit('addDislike')"
        />
        <Button
          :variant="ButtonVariant.Secondary"
          :disabled="dislikesFull"
          data-testid="unlock-dislike-add"
          @click="emit('addDislike')"
        >
          {{ t('meals.unlock.dislikes.add') }}
        </Button>
        <ul
          v-if="draft.dislikes.length > 0"
          class="flex flex-wrap gap-2"
          :aria-label="t('meals.unlock.dislikes.listLabel')"
          data-testid="unlock-dislikes"
        >
          <li v-for="dislike in draft.dislikes" :key="dislike">
            <button
              type="button"
              class="inline-flex min-h-tap items-center gap-1 rounded-pill border-2 border-border-strong bg-surface px-4 text-sm font-medium text-text focus-ring"
              :aria-label="t('meals.unlock.dislikes.remove', { name: dislike })"
              @click="emit('removeDislike', dislike)"
            >
              <span aria-hidden="true">{{ dislike }} ×</span>
            </button>
          </li>
        </ul>
      </div>

      <ChipGroup
        :model-value="draft.mealsPerDay"
        :options="options.mealsPerDay"
        :label="t('meals.unlock.mealsPerDay.label')"
        @update:model-value="
          draft.mealsPerDay = pickedOne($event, MEALS_PER_DAY_OPTIONS) ?? draft.mealsPerDay
        "
      />

      <ChipGroup
        :model-value="draft.cookingEffort"
        :options="options.cookingEffort"
        :label="t('meals.unlock.cooking.label')"
        @update:model-value="
          draft.cookingEffort = pickedOne($event, COOKING_EFFORT_OPTIONS) ?? draft.cookingEffort
        "
      />

      <p v-if="messageKey" role="alert" class="text-base text-text" data-testid="unlock-error">
        {{ t(messageKey) }}
      </p>
      <Button block :type="ButtonType.Submit" :disabled="saving" data-testid="unlock-save">
        {{ t('meals.unlock.save') }}
      </Button>
    </form>
  </Card>
</template>
