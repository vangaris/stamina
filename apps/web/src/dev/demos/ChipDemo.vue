<script setup lang="ts">
import { Chip } from '@stamina/ui-chip';
import { ref } from 'vue';

const padel = ref(true);
const kite = ref(false);
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Chip :selected="padel" @click="padel = !padel">Padel</Chip>
    <Chip :selected="kite" @click="kite = !kite">Kitesurf</Chip>
    <Chip disabled>Disabled</Chip>
  </div>
</template>
