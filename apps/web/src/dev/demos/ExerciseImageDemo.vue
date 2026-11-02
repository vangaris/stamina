<script setup lang="ts">
import { ExerciseImage } from '@stamina/ui-exercise-image';

// The real component takes a wger media URL. The demo draws its picture inline so the dev page
// needs no network, and points the second one at a file that does not exist to show the fallback.
const PICTURE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e5e7eb"/><circle cx="200" cy="90" r="30" fill="#6b7280"/><path d="M120 230l60-90h40l60 90z" fill="#6b7280"/></svg>',
)}`;
const MISSING = '/dev/missing-exercise-image.png';

const attribution = {
  author: 'Everkinetic',
  authorUrl: 'https://everkinetic.com',
  licence: 'CC-BY-SA 3.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  sourceUrl: 'https://wger.de/en/exercise/345/view/',
  authorLabel: 'Image by',
  sourceLabel: 'Source: wger',
  newTabLabel: 'opens in a new tab',
  unavailableLabel: 'Image unavailable',
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="max-w-md">
      <h3 class="mb-2 text-lg font-semibold">With an author page</h3>
      <ExerciseImage
        v-bind="attribution"
        :src="PICTURE"
        alt="A person in the lowered position of a push-up"
      />
    </div>

    <div class="max-w-md">
      <h3 class="mb-2 text-lg font-semibold">Author without a page</h3>
      <ExerciseImage
        v-bind="attribution"
        :src="PICTURE"
        :author-url="null"
        author="wger contributor"
        licence="CC-BY-SA 4.0"
        licence-url="https://creativecommons.org/licenses/by-sa/4.0/"
        alt="A person holding a dumbbell at the chest in the bottom of a squat"
      />
    </div>

    <div class="max-w-md">
      <h3 class="mb-2 text-lg font-semibold">Image cannot be loaded</h3>
      <ExerciseImage v-bind="attribution" :src="MISSING" alt="A person doing a plank" />
    </div>
  </div>
</template>
