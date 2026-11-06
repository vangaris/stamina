<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { RestTimer } from '@stamina/ui-rest-timer';
import { onBeforeUnmount, ref } from 'vue';

const START_SECONDS = 90;
const ADD_SECONDS = 15;

const resting = ref(false);
const remaining = ref(START_SECONDS);
const total = ref(START_SECONDS);
const skipped = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

function stop() {
  clearInterval(timer);
  timer = undefined;
}

function run() {
  if (timer) return;
  timer = setInterval(() => {
    remaining.value = Math.max(0, remaining.value - 1);
    if (remaining.value === 0) stop();
  }, 1000);
}

function start() {
  remaining.value = START_SECONDS;
  total.value = START_SECONDS;
  resting.value = true;
  run();
}

function skip() {
  stop();
  resting.value = false;
  skipped.value++;
}

function add() {
  remaining.value += ADD_SECONDS;
  total.value = Math.max(total.value, remaining.value);
  run();
}

const announce = (seconds: number) =>
  seconds === 0 ? 'Rest is over' : `${seconds} seconds of rest left`;

onBeforeUnmount(stop);
</script>

<template>
  <Button @click="start">Start rest</Button>
  <p class="mt-2 text-sm text-text-muted">Rests ended {{ skipped }}</p>

  <RestTimer
    v-if="resting"
    :remaining-seconds="remaining"
    :total-seconds="total"
    label="Rest"
    skip-label="Skip rest"
    add-label="+15 s"
    next-label="Next: Bench press, set 2"
    :announce="announce"
    @skip="skip"
    @add="add"
  />
</template>
