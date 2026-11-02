<script setup lang="ts">
import { useRouter } from 'vue-router';
import { RoutePath } from '../../../enums/route-path.ts';
import { useSignIn } from '../composables/useSignIn.ts';
import { SignInStep } from '../enums/sign-in-step.ts';
import CodeStep from './CodeStep.vue';
import EmailStep from './EmailStep.vue';

const router = useRouter();
const {
  step,
  email,
  code,
  errorKey,
  noticeKey,
  busy,
  resendSeconds,
  setEmail,
  setCode,
  submitEmail,
  submitCode,
  resend,
  signInWithGoogle,
  back,
} = useSignIn({
  // Onboarding decides where a signed-in person goes: Today, the screens, or the invite first.
  onSignedIn: () => void router.push(RoutePath.Onboarding),
  callbackUrl: new URL(RoutePath.Onboarding, window.location.origin).href,
});
</script>

<template>
  <EmailStep
    v-if="step === SignInStep.Email"
    :email="email"
    :error-key="errorKey"
    :busy="busy"
    @update:email="setEmail"
    @submit="submitEmail"
    @google="signInWithGoogle"
  />
  <CodeStep
    v-else
    :email="email"
    :code="code"
    :error-key="errorKey"
    :notice-key="noticeKey"
    :busy="busy"
    :resend-seconds="resendSeconds"
    @update:code="setCode"
    @submit="submitCode"
    @resend="resend"
    @back="back"
  />
</template>
