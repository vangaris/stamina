<script setup lang="ts">
import { Tabs, type TabsItem } from '@stamina/ui-tabs';
import { ref } from 'vue';

const items: TabsItem[] = [
  { id: 'overview', label: 'Session overview' },
  { id: 'focus', label: 'Focus' },
  { id: 'history', label: 'Ιστορικό προπονήσεων και αποτελεσμάτων' },
  { id: 'coach', label: 'Coach notes', disabled: true },
];
const active = ref('overview');

const mealItems: TabsItem[] = [
  { id: 'meals', label: 'Meals' },
  { id: 'targets', label: 'Targets' },
];
const mealsActive = ref('meals');
const protein = ref(120);
</script>

<template>
  <Tabs v-model="active" :items="items" label="Training session">
    <template #overview>
      <p class="text-base text-text">Padel with Nikos, 18:00. Warm-up, 3 sets, cool-down.</p>
    </template>
    <template #focus>
      <p class="text-base text-text">Back squat 5 × 5 at 80 kg, RPE 7.</p>
    </template>
    <template #history>
      <p class="text-base text-text">Τελευταίες 4 εβδομάδες: 12 προπονήσεις, kitesurf δύο φορές.</p>
    </template>
    <template #coach>
      <p class="text-base text-text">Not shown: this tab is disabled.</p>
    </template>
  </Tabs>

  <div class="mt-6">
    <Tabs v-model="mealsActive" :items="mealItems" label="Nutrition">
      <template #meals>
        <button
          type="button"
          class="min-h-tap rounded-md border border-border-strong px-4 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          @click="protein += 20"
        >
          Log 20 g protein ({{ protein }} g today)
        </button>
      </template>
      <template #targets>
        <p class="text-base text-text">Protein 140 g, water 2.5 l.</p>
      </template>
    </Tabs>
  </div>
</template>
