<script setup lang="ts">
import { computed } from 'vue';
import { LOAD_BARS_CHART_HEIGHT_REM } from '../config.ts';
import type { LoadBarsProps } from '../types.ts';
import { formatLoadBarsNumber } from '../utils/format-load-bars-number.ts';
import { toWeekRowLabel } from '../utils/to-week-row-label.ts';
import { computeLoadBarsScale } from '../utils/compute-load-bars-scale.ts';

/**
 * Weekly Load bars, oldest first. Done is solid, planned is dashed and stacked on top, the
 * current week is bold with a filled column, and an optional line marks the average. The picture
 * is hidden from assistive tech; a visually hidden table carries the same numbers.
 */
const props = defineProps<LoadBarsProps>();

const scale = computed(() => computeLoadBarsScale(props.weeks, props.average));
const rows = computed(() => props.weeks.map((week, i) => ({ week, bar: scale.value.bars[i] })));
const plotStyle = { height: `${LOAD_BARS_CHART_HEIGHT_REM}rem` };
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <div aria-hidden="true" class="flex flex-col gap-1">
      <div class="relative flex items-stretch gap-2 border-b border-border-strong" :style="plotStyle">
        <div
          v-for="({ week, bar }, i) in rows"
          :key="i"
          class="flex min-w-0 flex-1 flex-col justify-end rounded-sm px-1"
          :class="week.current ? 'bg-load-soft' : ''"
        >
          <div
            v-if="bar && bar.plannedPercent > 0"
            class="w-full border-2 border-dashed border-load"
            :style="{ height: `${bar.plannedPercent}%` }"
          />
          <div
            v-if="bar && bar.donePercent > 0"
            class="w-full bg-load"
            :style="{ height: `${bar.donePercent}%` }"
          />
        </div>
        <div
          v-if="scale.averagePercent !== null"
          class="pointer-events-none absolute start-0 end-0 border-t-2 border-text"
          :style="{ bottom: `${scale.averagePercent}%` }"
        >
          <span class="absolute end-0 bottom-0 bg-surface px-1 text-xs text-text">{{
            averageLabel
          }}</span>
        </div>
      </div>
      <div class="flex gap-2">
        <span
          v-for="({ week }, i) in rows"
          :key="i"
          class="min-w-0 flex-1 truncate px-1 text-center text-xs"
          :class="week.current ? 'font-bold text-text underline' : 'text-text-muted'"
          >{{ week.label }}</span
        >
      </div>
    </div>
    <table class="sr-only">
      <caption>
        {{
          label
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ weekLabel }}</th>
          <th scope="col">{{ doneLabel }}</th>
          <th scope="col">{{ plannedLabel }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="({ week }, i) in rows" :key="i">
          <th scope="row">{{ toWeekRowLabel(week, currentLabel) }}</th>
          <td>{{ formatLoadBarsNumber(week.done, locale) }}</td>
          <td>{{ formatLoadBarsNumber(week.planned, locale) }}</td>
        </tr>
        <tr v-if="average !== null">
          <th scope="row">{{ averageLabel }}</th>
          <td colspan="2">{{ formatLoadBarsNumber(average, locale) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
