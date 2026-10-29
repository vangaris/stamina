<script setup lang="ts">
import { computed } from 'vue';
import { useApiHealth } from '../composables/useApiHealth.ts';

const { state } = useApiHealth();

const apiStatus = computed(
  () =>
    ({
      unknown: 'Checking…',
      ok: 'Connected',
      degraded: 'Database unavailable',
      unreachable: 'Offline',
    })[state.value.kind],
);
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">Today</h1>
    <p data-testid="api-status" class="mt-2 text-sm text-neutral-700">Server: {{ apiStatus }}</p>
  </section>
</template>
