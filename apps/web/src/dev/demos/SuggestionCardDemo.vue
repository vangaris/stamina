<script setup lang="ts">
import { SuggestionCard } from '@stamina/ui-suggestion-card';
import { ref } from 'vue';

const decided = ref<string | undefined>();
</script>

<template>
  <SuggestionCard
    title="A suggestion for you"
    change="Move your Session from Thu to Fri."
    reason="You played 90 min at a hard effort (Load 540), and your next Session is 24 hours later. Your body usually needs about 48 hours."
    accept-label="Accept"
    decline-label="Keep my plan"
    :decided-note="decided"
    @accept="decided = 'Saved on this phone. It will be sent when you are back online.'"
    @decline="decided = 'Keeping your plan.'"
  />
</template>
