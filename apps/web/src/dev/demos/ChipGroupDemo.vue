<script setup lang="ts">
import { ChipGroup } from '@stamina/ui-chip-group';
import { ref } from 'vue';

const sports = [
  { value: 'padel', label: 'Padel' },
  { value: 'kitesurf', label: 'Kitesurf' },
  { value: 'gym', label: 'Gym' },
  { value: 'running', label: 'Running' },
  { value: 'swimming', label: 'Swimming', disabled: true },
];
const rpe = Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
const allergens = [
  'Gluten',
  'Crustaceans',
  'Eggs',
  'Fish',
  'Peanuts',
  'Soy',
  'Milk',
  'Nuts',
  'Celery',
  'Mustard',
  'Sesame',
  'Sulphites',
  'Lupin',
  'Molluscs',
].map((label) => ({ value: label.toLowerCase(), label }));
const weekdays = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

const sport = ref<string | number | null>('padel');
const effort = ref<string | number | null>(null);
const avoid = ref<(string | number)[]>(['nuts', 'milk']);
const days = ref<(string | number)[]>([1, 3, 6]);
</script>

<template>
  <div class="flex flex-col gap-6">
    <ChipGroup v-model="sport" label="Main sport" :options="sports" />
    <ChipGroup v-model="effort" label="RPE (1-10)" :options="rpe" allow-deselect />
    <ChipGroup v-model="avoid" label="Allergens" :options="allergens" multiple />
    <ChipGroup v-model="days" label="Available days" :options="weekdays" multiple />
  </div>
</template>
