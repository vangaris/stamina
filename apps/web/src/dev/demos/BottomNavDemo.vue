<script setup lang="ts">
import { BottomNav } from '@stamina/ui-bottom-nav';
import { ref } from 'vue';

const items = [
  { id: 'today', label: 'Today', href: '#today' },
  { id: 'session', label: 'Session', href: '#session' },
  { id: 'meals', label: 'Meals', href: '#meals' },
  { id: 'progress', label: 'Progress', href: '#progress' },
];
const activeId = ref('session');
</script>

<template>
  <BottomNav
    :items="items"
    :active-id="activeId"
    label="Demo navigation"
    class="overflow-hidden rounded-lg border"
    @select="activeId = $event"
  />
</template>
