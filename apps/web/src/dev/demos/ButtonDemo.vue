<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button>Primary</Button>
    <Button :variant="ButtonVariant.Secondary">Secondary</Button>
    <Button :variant="ButtonVariant.Ghost">Ghost</Button>
    <Button :variant="ButtonVariant.Danger">Stop</Button>
    <Button disabled>Disabled</Button>
  </div>
  <Button block class="mt-2">Full width</Button>
</template>
