<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { ChipGroup } from '@stamina/ui-chip-group';
import { SetDots } from '@stamina/ui-set-dots';
import { Stepper } from '@stamina/ui-stepper';
import { MAX_LOGGED_REPS, MAX_WEIGHT_KG, PrescriptionUnit } from '@stamina/domain';
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { pickedOne, toOptions } from '../../onboarding/index.ts';
import { MIN_REPS, REPS_STEP, SECONDS_STEP, SET_RPE_VALUES, WEIGHT_STEP_KG } from '../config.ts';
import type { FocusViewEmits, FocusViewProps } from '../types.ts';
import { createNumberFormat } from '../utils/create-number-format.ts';

const props = defineProps<FocusViewProps>();
const emit = defineEmits<FocusViewEmits>();

const weightKg = defineModel<number>('weightKg', { required: true });
const reps = defineModel<number>('reps', { required: true });
const rpe = defineModel<number>('rpe', { required: true });

const { t } = useI18n();
const titleId = useId();

const format = computed(() => createNumberFormat(props.locale));
const timed = computed(() => props.focus.unit === PrescriptionUnit.Seconds);
const repsKey = computed(() => (timed.value ? 'focus.seconds' : 'focus.reps'));
const rpeOptions = toOptions(SET_RPE_VALUES, String);
</script>

<template>
  <section class="flex flex-col gap-4" :aria-labelledby="titleId" data-testid="focus-view">
    <header class="flex flex-col gap-1">
      <p class="text-sm text-text-muted" data-testid="focus-position">
        {{
          t('session.focus.position', {
            slot: t(`program.blocks.${focus.slot}`),
            position: focus.position,
            total: focus.total,
          })
        }}
      </p>
      <h1 :id="titleId" class="text-2xl font-semibold">{{ focus.name }}</h1>
      <p v-if="focus.swapped" class="text-sm text-text-muted">{{ t('session.focus.swapped') }}</p>
    </header>

    <div class="flex flex-col gap-1" data-testid="focus-target">
      <p class="text-lg font-medium text-text">
        {{ t(focus.target.prescription.key, focus.target.prescription.params ?? {}) }}
      </p>
      <p v-if="focus.target.effort" class="text-base text-text">
        {{ t(focus.target.effort.key, focus.target.effort.params ?? {}) }}
      </p>
      <p v-if="focus.target.weight" class="text-base text-text-muted">
        {{ t(focus.target.weight.key, focus.target.weight.params ?? {}) }}
      </p>
    </div>

    <SetDots
      :total="focus.dotTotal"
      :done="focus.doneSets"
      :current="focus.showSteppers ? focus.doneSets : undefined"
      :label="
        focus.showSteppers
          ? t('session.focus.setDots', { set: focus.setNumber, total: focus.dotTotal })
          : t('session.focus.setDotsDone', { total: focus.dotTotal })
      "
    />

    <template v-if="focus.showSteppers">
      <Stepper
        v-if="focus.showWeight"
        v-model="weightKg"
        :label="t('session.focus.weight.label')"
        :decrement-label="t('session.focus.weight.decrease')"
        :increment-label="t('session.focus.weight.increase')"
        :unit="t('session.unit.kg')"
        :format="format"
        :min="0"
        :max="MAX_WEIGHT_KG"
        :step="WEIGHT_STEP_KG"
      />
      <Stepper
        v-model="reps"
        :label="t(`session.${repsKey}.label`)"
        :decrement-label="t(`session.${repsKey}.decrease`)"
        :increment-label="t(`session.${repsKey}.increase`)"
        :unit="t(timed ? 'session.unit.seconds' : 'session.unit.reps', { count: reps })"
        :min="MIN_REPS"
        :max="MAX_LOGGED_REPS"
        :step="timed ? SECONDS_STEP : REPS_STEP"
      />
      <div class="flex flex-col gap-1">
        <ChipGroup
          :model-value="rpe"
          :options="rpeOptions"
          :label="t('session.focus.rpe.label')"
          @update:model-value="rpe = pickedOne($event, SET_RPE_VALUES) ?? rpe"
        />
        <p class="text-sm text-text-muted">{{ t('session.focus.rpe.hint') }}</p>
      </div>
      <Button block data-testid="set-done" @click="emit('done')">
        {{ t('session.focus.done', { set: focus.setNumber }) }}
      </Button>
    </template>
    <template v-else>
      <Button
        v-if="focus.canAddSet"
        block
        :variant="ButtonVariant.Secondary"
        data-testid="add-set"
        @click="emit('add-set')"
      >
        {{ t('session.focus.addSet') }}
      </Button>
      <Button v-if="focus.hasNextExercise" block @click="emit('next')">
        {{ t('session.focus.nextExercise') }}
      </Button>
      <Button v-else block @click="emit('finish')">{{ t('session.focus.finish') }}</Button>
    </template>

    <p role="status" class="min-h-6 text-sm text-text-muted" data-testid="set-status">
      <template v-if="status">{{
        t(`session.status.${status.status}`, { set: status.setNumber })
      }}</template>
    </p>
    <p v-if="errorKey" role="alert" class="text-sm text-danger">{{ t(errorKey) }}</p>

    <div class="flex flex-wrap gap-2">
      <Button
        :variant="ButtonVariant.Secondary"
        data-testid="open-overview"
        @click="emit('overview')"
      >
        {{ t('session.focus.overview') }}
      </Button>
      <Button
        v-if="focus.canSwap"
        :variant="ButtonVariant.Secondary"
        data-testid="open-swap"
        @click="emit('swap')"
      >
        {{ t('session.focus.swap') }}
      </Button>
    </div>
  </section>
</template>
