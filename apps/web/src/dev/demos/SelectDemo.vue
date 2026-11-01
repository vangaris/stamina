<script setup lang="ts">
import { Select } from '@stamina/ui-select';
import { ref } from 'vue';

const countries = [
  { value: 'GR', label: 'Greece' },
  { value: 'PT', label: 'Portugal' },
  { value: 'ES', label: 'Spain' },
  { value: 'US', label: 'United States' },
];

const country = ref('');
const chosen = ref('GR');
const missing = ref('');
const locked = ref('PT');
</script>

<template>
  <form class="flex max-w-md flex-col gap-4" @submit.prevent>
    <Select
      v-model="country"
      label="Country of residence"
      placeholder="Choose a country"
      :options="countries"
      autocomplete="country"
      name="country"
      required
    />
    <Select
      v-model="chosen"
      label="Country (chosen)"
      placeholder="Choose a country"
      :options="countries"
      hint="Where you live, not where you were born"
    />
    <Select
      v-model="missing"
      label="Country (error state)"
      placeholder="Choose a country"
      :options="countries"
      error="Choose your country"
    />
    <Select
      v-model="locked"
      label="Disabled country"
      placeholder="Choose a country"
      :options="countries"
      disabled
    />
  </form>
</template>
