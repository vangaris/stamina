<script setup lang="ts">
import { Button, ButtonType, ButtonVariant } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { TextField, TextFieldInputmode } from '@stamina/ui-text-field';
import { computed, onMounted, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { CODE_AUTOCOMPLETE, CODE_LENGTH } from '../config.ts';
import type { CodeStepEmits, CodeStepProps } from '../types.ts';

const props = defineProps<CodeStepProps>();
const emit = defineEmits<CodeStepEmits>();

const { t } = useI18n();
const headingId = useId();
const error = computed(() => (props.errorKey ? t(props.errorKey) : undefined));
const notice = computed(() => (props.noticeKey ? t(props.noticeKey) : undefined));

// The email step just left the screen: move the keyboard to the one new question.
const field = ref<InstanceType<typeof TextField> | null>(null);
onMounted(() => field.value?.focus());
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId">
    <form class="flex flex-col gap-4" novalidate @submit.prevent="emit('submit')">
      <div class="flex flex-col gap-1">
        <h1 :id="headingId" class="text-xl font-semibold">{{ t('signIn.code.title') }}</h1>
        <p class="text-sm text-text-muted">{{ t('signIn.code.description', { email }) }}</p>
      </div>
      <TextField
        ref="field"
        :model-value="code"
        :label="t('signIn.code.label', { length: CODE_LENGTH })"
        :error="error"
        :inputmode="TextFieldInputmode.Numeric"
        :autocomplete="CODE_AUTOCOMPLETE"
        :maxlength="CODE_LENGTH"
        required
        @update:model-value="emit('update:code', $event)"
      />
      <Button :type="ButtonType.Submit" :disabled="busy" block>
        {{ t('signIn.code.submit') }}
      </Button>
      <!-- Always rendered so that the notice is announced when it appears. -->
      <div role="status" class="empty:hidden">
        <p v-if="notice" class="text-sm text-text-muted">{{ notice }}</p>
      </div>
      <Button
        :variant="ButtonVariant.Secondary"
        :disabled="busy || resendSeconds > 0"
        block
        @click="emit('resend')"
      >
        {{
          resendSeconds > 0
            ? t('signIn.code.resendIn', { seconds: resendSeconds })
            : t('signIn.code.resend')
        }}
      </Button>
      <Button :variant="ButtonVariant.Ghost" block @click="emit('back')">
        {{ t('signIn.code.back') }}
      </Button>
    </form>
  </Card>
</template>
