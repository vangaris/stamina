<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card } from '@stamina/ui-card';
import { ref, useId } from 'vue';

const ids = { suggest: useId(), load: useId(), danger: useId(), accent: useId(), plain: useId() };
const moved = ref(false);
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card as="section" :labelled-by="ids.plain">
      <template #header>
        <h3 :id="ids.plain" class="text-lg font-semibold">Padel with Nikos</h3>
      </template>
      <p>Thursday 18:30, Court 3. About 90 min.</p>
      <template #footer>
        <p class="text-sm text-text-muted">Booked via club</p>
      </template>
    </Card>

    <Card as="section" tone="suggest" :labelled-by="ids.suggest">
      <template #header>
        <h3 :id="ids.suggest" class="text-lg font-semibold">Move Thursday's session a day?</h3>
      </template>
      <p>You slept 5 h and your legs carry a heavy load from kitesurf. Friday looks lighter.</p>
      <template #footer>
        <div class="flex flex-wrap gap-2">
          <Button @click="moved = true">Move to Friday</Button>
          <Button variant="secondary" @click="moved = false">Keep Thursday</Button>
        </div>
        <p v-if="moved" class="mt-2 text-sm" role="status">Moved to Friday.</p>
      </template>
    </Card>

    <Card as="section" tone="load" padding="lg" :labelled-by="ids.load">
      <template #header>
        <h3 :id="ids.load" class="text-lg font-semibold">Load this week</h3>
      </template>
      <p>12 sets, 62 kg top weight, RPE 8 average. Recovery is on track.</p>
    </Card>

    <Card as="article" tone="accent" :labelled-by="ids.accent">
      <template #header>
        <h3 :id="ids.accent" class="text-lg font-semibold">Today: lower body</h3>
      </template>
      <p>5 sets of 8 reps, squats at 70 kg.</p>
    </Card>

    <Card as="section" tone="danger" :labelled-by="ids.danger">
      <template #header>
        <h3 :id="ids.danger" class="text-lg font-semibold">Check with a professional</h3>
      </template>
      <p>
        You mentioned a chest pain during effort. Stamina can't assess this: please see a doctor
        before the next session.
      </p>
    </Card>

    <ul class="flex list-none flex-col gap-2 p-0">
      <Card as="li">
        <p class="font-semibold">08:00 Breakfast</p>
        <p class="text-sm">Greek yoghurt, oats, banana</p>
      </Card>
      <Card as="li" tone="accent">
        <p class="font-semibold">18:30 Padel</p>
        <p class="text-sm">Warm up 10 min first</p>
      </Card>
      <Card as="li" tone="suggest">
        <p class="font-semibold">22:00 Wind down</p>
        <p class="text-sm">Aim for 8 h of sleep</p>
      </Card>
    </ul>
  </div>
</template>
