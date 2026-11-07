<script setup lang="ts">
import { ActivityRow } from '../../activity/index.ts';
import type { TimelineActivityEntryProps } from '../types.ts';

defineProps<TimelineActivityEntryProps>();
</script>

<template>
  <ActivityRow :activity="activity" class="flex-1" />
</template>
