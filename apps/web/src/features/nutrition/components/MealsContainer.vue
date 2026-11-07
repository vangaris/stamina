<script setup lang="ts">
import { NutritionStatus } from '@stamina/contracts';
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Card } from '@stamina/ui-card';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { RoutePath } from '../../../enums/route-path.ts';
import { i18n } from '../../../i18n.ts';
import { RedsCard } from '../../safety/index.ts';
import { useNutrition } from '../composables/useNutrition.ts';
import { useUnlockMeals } from '../composables/useUnlockMeals.ts';
import { NutritionLoadStatus } from '../enums/nutrition-load-status.ts';
import DietitianPromptCard from './DietitianPromptCard.vue';
import HydrationCard from './HydrationCard.vue';
import TargetsCard from './TargetsCard.vue';
import UnlockMealsForm from './UnlockMealsForm.vue';

const { t } = useI18n();
const { locale } = i18n.global;
const router = useRouter();
const onNavigate = (path: RoutePath) => void router.replace(path);
const flow = useNutrition({ onNavigate });
const unlock = useUnlockMeals({ onNavigate, onSaved: flow.load });
const { status, messageKey, waterMessageKey, nutrition } = flow;
const { draft, askDirection, missing, messageKey: unlockMessageKey } = unlock;

onMounted(() => {
  void flow.load();
  void unlock.load();
});
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-xl font-semibold">{{ t('nav.meals') }}</h1>
    <p v-if="status === NutritionLoadStatus.Loading" role="status" class="text-base text-text-muted">
      {{ t('meals.loading') }}
    </p>
    <Card v-else-if="status === NutritionLoadStatus.Failed" data-testid="meals-failed">
      <div class="flex flex-col gap-3">
        <p role="alert" class="text-base text-text">{{ messageKey ? t(messageKey) : '' }}</p>
        <Button :variant="ButtonVariant.Secondary" @click="flow.load">
          {{ t('meals.retry') }}
        </Button>
      </div>
    </Card>
    <template v-else-if="nutrition">
      <UnlockMealsForm
        v-if="nutrition.status === NutritionStatus.Locked"
        v-model:draft="draft"
        :ask-direction="askDirection"
        :missing="missing"
        :status="unlock.status.value"
        :message-key="unlockMessageKey"
        @submit="unlock.submit"
        @add-dislike="unlock.add"
        @remove-dislike="unlock.remove"
      />
      <Card v-else-if="nutrition.status === NutritionStatus.Off" data-testid="meals-off">
        <p class="text-base text-text">{{ t('screening.outcome.nutritionOff') }}</p>
      </Card>
      <template v-else>
        <TargetsCard :nutrition="nutrition" :locale="locale" />
        <DietitianPromptCard v-if="nutrition.rateCheck.prompt" />
        <HydrationCard
          :nutrition="nutrition"
          :locale="locale"
          :failed-key="waterMessageKey"
          @log="flow.addWater"
        />
        <RedsCard />
        <p class="text-sm text-text-muted" data-testid="meals-guidance">
          {{ t('meals.guidance') }}
        </p>
      </template>
    </template>
  </section>
</template>
