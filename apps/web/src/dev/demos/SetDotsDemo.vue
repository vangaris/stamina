<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { SetDots } from '@stamina/ui-set-dots';
import { computed, ref } from 'vue';

const total = 4;
const done = ref(1);
const current = computed(() => (done.value < total ? done.value : undefined));
const label = computed(() =>
  done.value < total ? `Set ${done.value + 1} of ${total}` : `All ${total} sets done`,
);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <p class="text-sm text-text-muted">Bench press, logged live</p>
      <SetDots :total="total" :done="done" :current="current" :label="label" />
      <div class="flex gap-2">
        <Button :disabled="done >= total" @click="done++">Done · set {{ done + 1 }}</Button>
        <Button @click="done = 0">Reset</Button>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <p class="text-sm text-text-muted">Nothing logged yet</p>
      <SetDots :total="3" :done="0" :current="0" label="Set 1 of 3" />
    </div>
    <div class="flex flex-col gap-2">
      <p class="text-sm text-text-muted">Finished</p>
      <SetDots :total="5" :done="5" label="All 5 sets done" />
    </div>
  </div>
</template>
