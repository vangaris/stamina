<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { ToastRegion, type ToastItem } from '@stamina/ui-toast';
import { ref } from 'vue';

// The demo owns the queue; the kit only renders and reports.
const toasts = ref<ToastItem[]>([]);
const log = ref('');
let next = 0;

function add(toast: Omit<ToastItem, 'id'>) {
  toasts.value = [...toasts.value, { id: `toast-${next++}`, ...toast }];
}

function remove(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

function onAction(id: string) {
  log.value = `Undone: ${toasts.value.find((t) => t.id === id)?.message ?? id}`;
  remove(id);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap gap-2">
      <Button variant="secondary" @click="add({ message: 'Set saved: 80 kg × 8' })">Info</Button>
      <Button variant="secondary" @click="add({ message: 'Back online, synced', tone: 'success' })">
        Success
      </Button>
      <Button
        variant="secondary"
        @click="
          add({ message: 'Could not save your weigh-in. Check your connection.', tone: 'danger' })
        "
      >
        Danger
      </Button>
      <Button
        variant="secondary"
        @click="add({ message: 'Padel session removed', tone: 'success', actionLabel: 'Undo' })"
      >
        With action
      </Button>
      <Button
        variant="secondary"
        @click="add({ message: 'Program Adaptation accepted', durationMs: null })"
      >
        Stays until closed
      </Button>
    </div>
    <p class="text-sm text-text-muted">{{ log || 'Nothing undone yet.' }}</p>
    <!-- Absolute positioning keeps the demo from covering the rest of the page. -->
    <div
      data-testid="toast-box"
      class="relative min-h-[20rem] overflow-hidden rounded-lg border border-border bg-surface-sunken"
    >
      <ToastRegion
        :toasts="toasts"
        dismiss-label="Dismiss"
        position="absolute"
        @dismiss="remove"
        @action="onAction"
      />
    </div>
  </div>
</template>
