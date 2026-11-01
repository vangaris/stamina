<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Sheet } from '@stamina/ui-sheet';
import { ref, useId } from 'vue';

const logOpen = ref(false);
const confirmOpen = ref(false);
const minutes = ref('90');
const minutesId = useId();
const saved = ref(0);
const discarded = ref(0);

const notes = [
  'Padel on Saturday with Nikos: three sets, the last one went to a tie-break. Your legs felt heavy in the second set, which fits the long run you did on Thursday.',
  'Logging the session as "I played" adds an estimated load for your quads, calves and shoulders. You can correct the duration and the effort below; Stamina adjusts Monday’s Session around it.',
  'Kitesurf sessions work the same way: a windy afternoon counts for more than a calm one, so tell us how hard it felt on a scale from 1 to 10 (RPE).',
  'If you ate late or slept badly the night before, mention it in the notes. Recovery suggestions look at sleep and food together, not one number at a time.',
  'Nothing here changes your weights. Your bench stays at 62.5 kg for 3 x 8 until you log a clean set at RPE 8 or lower, then the next suggestion is 65 kg.',
  'Σε περίπτωση που ο αγώνας κράτησε περισσότερο από το αναμενόμενο, αύξησε τη διάρκεια και πρόσθεσε μια σημείωση για την προπόνηση της επόμενης μέρας.',
];
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button @click="logOpen = true">Open sheet</Button>
    <Button :variant="ButtonVariant.Secondary" @click="confirmOpen = true"
      >Open confirmation</Button
    >
  </div>
  <p class="mt-2 text-sm text-text-muted">Saved {{ saved }}, discarded {{ discarded }}</p>

  <Sheet v-model:open="logOpen" title="I played: padel" close-label="Close">
    <p v-for="note in notes" :key="note" class="mb-3 text-base">{{ note }}</p>
    <label :for="minutesId" class="mb-1 block text-sm font-semibold">Duration (minutes)</label>
    <input
      :id="minutesId"
      v-model="minutes"
      type="text"
      inputmode="numeric"
      class="mb-3 min-h-tap w-full rounded-md border border-border-strong bg-surface px-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    />
    <template #footer>
      <Button
        @click="
          saved++;
          logOpen = false;
        "
      >
        Save session
      </Button>
      <Button :variant="ButtonVariant.Secondary" @click="logOpen = false">Cancel</Button>
    </template>
  </Sheet>

  <Sheet
    v-model:open="confirmOpen"
    title="Skip today’s Session?"
    close-label="Close"
    :dismiss-on-scrim="false"
  >
    <p class="text-base">
      Leg day moves to Thursday and the rest of the week’s Program shifts by one day. You can undo
      this from the Program screen.
    </p>
    <template #footer>
      <Button
        :variant="ButtonVariant.Danger"
        @click="
          discarded++;
          confirmOpen = false;
        "
      >
        Skip Session
      </Button>
      <Button :variant="ButtonVariant.Secondary" @click="confirmOpen = false">Keep it</Button>
    </template>
  </Sheet>
</template>
