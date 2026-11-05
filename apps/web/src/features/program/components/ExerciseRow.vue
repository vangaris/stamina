<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ExerciseRowProps } from '../types.ts';
import { localizedName } from '../utils/localized-name.ts';
import { toLoadView } from '../utils/to-load-view.ts';
import { toPrescriptionView } from '../utils/to-prescription-view.ts';

const props = defineProps<ExerciseRowProps>();

const { t } = useI18n();

const name = computed(() => localizedName(props.exercise, props.locale));
const prescription = computed(() => {
  const view = toPrescriptionView(props.exercise);
  return t(view.key, view.params);
});
const load = computed(() => {
  const view = toLoadView(props.exercise);
  return view ? t(view.key, view.params) : undefined;
});
</script>

<template>
  <li class="flex flex-col">
    <span class="text-base text-text">{{ name }}</span>
    <span class="text-sm text-text-muted">{{ prescription }}</span>
    <span v-if="load" class="text-sm text-text-muted">{{ load }}</span>
  </li>
</template>
