<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Card, CardElement, CardTone } from '@stamina/ui-card';
import { useId } from 'vue';
import type { SuggestionCardEmits, SuggestionCardProps } from '../types.ts';

withDefaults(defineProps<SuggestionCardProps>(), {
  decidedNote: undefined,
  busy: false,
  acceptTestId: undefined,
  declineTestId: undefined,
});
const emit = defineEmits<SuggestionCardEmits>();

const headingId = useId();
</script>

<template>
  <Card :as="CardElement.Section" :tone="CardTone.Suggest" :labelled-by="headingId">
    <template #header>
      <h2 :id="headingId" class="text-lg font-semibold">{{ title }}</h2>
    </template>
    <p class="font-semibold">{{ change }}</p>
    <p class="mt-2 text-sm">{{ reason }}</p>
    <template #footer>
      <p v-if="decidedNote" role="status" class="text-sm">{{ decidedNote }}</p>
      <div v-else class="flex flex-wrap gap-2">
        <Button :disabled="busy" :data-testid="acceptTestId" @click="emit('accept')">
          {{ acceptLabel }}
        </Button>
        <Button
          :variant="ButtonVariant.Secondary"
          :disabled="busy"
          :data-testid="declineTestId"
          @click="emit('decline')"
        >
          {{ declineLabel }}
        </Button>
      </div>
    </template>
  </Card>
</template>
