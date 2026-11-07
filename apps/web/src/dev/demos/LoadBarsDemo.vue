<script setup lang="ts">
import { LoadBars } from '@stamina/ui-load-bars';

const weeks = [
  { label: 'Oct 12', done: 310, planned: 0 },
  { label: 'Oct 19', done: 280, planned: 0 },
  { label: 'Oct 26', done: 350, planned: 0 },
  { label: 'Nov 2', done: 290, planned: 0 },
  { label: 'This week', done: 180, planned: 120, current: true },
];
</script>

<template>
  <div class="flex flex-col gap-6">
    <LoadBars
      :weeks="weeks"
      :average="308"
      label="Weekly Load, last four weeks and this week"
      average-label="Your usual"
      done-label="Done"
      planned-label="Planned"
      week-label="Week"
      current-label="this week"
      locale="en"
    />
    <LoadBars
      :weeks="[{ label: 'This week', done: 0, planned: 150, current: true }]"
      :average="null"
      label="Weekly Load, no history yet"
      average-label="Your usual"
      done-label="Done"
      planned-label="Planned"
      week-label="Week"
      current-label="this week"
      locale="en"
    />
  </div>
</template>
