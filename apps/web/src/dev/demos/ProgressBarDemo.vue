<script setup lang="ts">
import { ProgressBar } from '@stamina/ui-progress-bar';
</script>

<template>
  <div class="flex flex-col gap-4">
    <ProgressBar
      :value="2"
      :max="3"
      label="Sessions this week"
      value-text="2 of 3 sessions"
      show-label
    >
      <template #caption>2 / 3</template>
    </ProgressBar>
    <ProgressBar
      :value="1.2"
      :max="2.5"
      tone="suggest"
      label="Water"
      value-text="1.2 of 2.5 litres"
      show-label
    >
      <template #caption>1.2 / 2.5 L</template>
    </ProgressBar>
    <ProgressBar
      :value="96"
      :max="140"
      tone="load"
      label="Protein"
      value-text="96 of 140 grams"
      show-label
    >
      <template #caption>96 / 140 g</template>
    </ProgressBar>
    <ProgressBar :value="0" label="Kitesurf sessions" value-text="0 of 2 sessions" show-label>
      <template #caption>0 / 2</template>
    </ProgressBar>
    <ProgressBar
      :value="3"
      :max="3"
      tone="suggest"
      label="Padel sessions"
      value-text="3 of 3 sessions, done"
      show-label
    >
      <template #caption>3 / 3 ✓</template>
    </ProgressBar>
    <ProgressBar
      :value="165"
      :max="140"
      tone="load"
      label="Protein over target"
      value-text="165 of 140 grams, over target"
      show-label
    >
      <template #caption>165 / 140 g (+25)</template>
    </ProgressBar>
    <ProgressBar
      :value="62"
      size="sm"
      label="Load vs average"
      value-text="62 % of your average"
      show-label
    >
      <template #caption>62 %</template>
    </ProgressBar>
    <ProgressBar :value="50" size="sm" tone="load" label="Weekly load, no caption" />
  </div>
</template>
