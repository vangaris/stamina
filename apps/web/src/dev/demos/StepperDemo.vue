<script setup lang="ts">
import { Stepper } from '@stamina/ui-stepper';
import { ref } from 'vue';

const weight = ref(62.5);
const reps = ref(8);
const locked = ref(40);
const greekWeight = ref(62.5);
const rpe = ref(7);

const greek = new Intl.NumberFormat('el-GR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <Stepper
      v-model="weight"
      label="Weight"
      decrement-label="Decrease weight by 2.5 kilograms"
      increment-label="Increase weight by 2.5 kilograms"
      :min="0"
      :max="300"
      :step="2.5"
      unit="kg"
    />
    <Stepper
      v-model="reps"
      label="Reps"
      decrement-label="One rep less"
      increment-label="One rep more"
      :min="1"
      :max="30"
      unit="reps"
    />
    <Stepper
      v-model="rpe"
      label="RPE (effort, 1 to 10)"
      decrement-label="Lower RPE"
      increment-label="Higher RPE"
      :min="1"
      :max="10"
    />
    <Stepper
      v-model="greekWeight"
      label="Βάρος"
      decrement-label="Μείωση βάρους κατά 2,5 κιλά"
      increment-label="Αύξηση βάρους κατά 2,5 κιλά"
      :min="0"
      :max="300"
      :step="2.5"
      unit="κιλά"
      :format="(value: number) => greek.format(value)"
    />
    <Stepper
      v-model="locked"
      label="Weight (locked during rest)"
      decrement-label="Decrease weight"
      increment-label="Increase weight"
      :min="0"
      :step="5"
      unit="kg"
      disabled
    />
  </div>
</template>
