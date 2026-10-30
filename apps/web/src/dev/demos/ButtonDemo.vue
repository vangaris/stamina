<script setup lang="ts">
import { Button } from '@stamina/ui-button';
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button>Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="danger">Stop</Button>
    <Button disabled>Disabled</Button>
  </div>
  <Button block class="mt-2">Full width</Button>
</template>
