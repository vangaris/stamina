<script setup lang="ts">
import { Checkbox } from '@stamina/ui-checkbox';
import { computed, ref } from 'vue';

const reminders = ref(false);
const consent = ref(false);
const submitted = ref(false);
const consentError = computed(() =>
  submitted.value && !consent.value ? 'Please accept to create your profile.' : '',
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <Checkbox v-model="reminders" description="At most one reminder per training day.">
      Remind me before padel sessions
    </Checkbox>

    <Checkbox v-model="consent" required :error="consentError">
      I explicitly consent to Stamina processing my health data (weight, sleep, heart rate and
      injuries) to personalise my training and recovery Program. I can withdraw this consent at any
      time. Read the
      <a href="#privacy" class="underline">privacy policy</a>.
    </Checkbox>
    <button
      type="button"
      class="min-h-tap self-start rounded-md border-2 border-border-strong bg-surface px-4 text-sm font-medium text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      @click="submitted = true"
    >
      Create profile
    </button>

    <Checkbox :model-value="true" disabled>Kitesurf sessions (managed by your coach)</Checkbox>
    <Checkbox :model-value="false" disabled>Συγχρονισμός με το ρολόι μου</Checkbox>
    <Checkbox :model-value="false" error="Pick at least one training day."> Monday </Checkbox>
  </div>
</template>
