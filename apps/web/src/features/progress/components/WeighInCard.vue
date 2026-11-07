<script setup lang="ts">
import { MAX_BODY_WEIGHT_KG, MIN_BODY_WEIGHT_KG } from '@stamina/domain';
import { Button, ButtonType } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { TextField, TextFieldInputmode } from '@stamina/ui-text-field';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { WeighInMessageKey } from '../enums/weigh-in-message-key.ts';
import { WeighInStatus } from '../enums/weigh-in-status.ts';
import type { WeighInCardEmits, WeighInCardProps } from '../types.ts';
import { formatShortDate } from '../utils/format-short-date.ts';
import { formatWeight } from '../utils/format-weight.ts';

defineProps<WeighInCardProps>();
const emit = defineEmits<WeighInCardEmits>();
const weight = defineModel<string>('weight', { required: true });

const { t } = useI18n();
const headingId = useId();
const limits = { min: MIN_BODY_WEIGHT_KG, max: MAX_BODY_WEIGHT_KG };
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="weigh-in">
    <form class="flex flex-col gap-3" novalidate @submit.prevent="emit('submit')">
      <div class="flex flex-col gap-1">
        <h2 :id="headingId" class="text-base font-semibold">{{ t('progress.weighIn.title') }}</h2>
        <p class="text-sm text-text-muted">{{ t('progress.weighIn.optional') }}</p>
        <p v-if="latest" class="text-base text-text" data-testid="weigh-in-latest">
          {{
            t('progress.weighIn.latest', {
              weight: formatWeight(latest.weightKg, locale),
              date: formatShortDate(latest.date, locale),
            })
          }}
        </p>
        <p v-else class="text-base text-text" data-testid="weigh-in-none">
          {{ t('progress.weighIn.none') }}
        </p>
        <p v-if="due" class="text-base text-text" data-testid="weigh-in-due">
          {{ t('progress.weighIn.due') }}
        </p>
        <p v-else class="text-base text-text" data-testid="weigh-in-done">
          {{ t('progress.weighIn.done') }}
        </p>
      </div>
      <TextField
        v-model="weight"
        :label="t('progress.weighIn.label')"
        :inputmode="TextFieldInputmode.Decimal"
        :hint="t('progress.weighIn.hint', limits)"
        :error="messageKey === WeighInMessageKey.Invalid ? t(messageKey, limits) : undefined"
        autocomplete="off"
        data-testid="weigh-in-weight"
      >
        <template #suffix>{{ t('progress.weighIn.unit') }}</template>
      </TextField>
      <p
        v-if="
          messageKey &&
          messageKey !== WeighInMessageKey.Invalid &&
          messageKey !== WeighInMessageKey.Saved
        "
        role="alert"
        class="text-base text-text"
        data-testid="weigh-in-error"
      >
        {{ t(messageKey) }}
      </p>
      <p
        v-else-if="status === WeighInStatus.Saved && messageKey"
        role="status"
        class="text-base text-text"
        data-testid="weigh-in-notice"
      >
        {{ t(messageKey) }}
      </p>
      <Button block :type="ButtonType.Submit" :disabled="saving" data-testid="weigh-in-save">
        {{ t('progress.weighIn.save') }}
      </Button>
    </form>
  </Card>
</template>
