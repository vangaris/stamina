import { requestEmailCode, startGoogleSignIn, verifyEmailCode } from '@stamina/app-core';
import { ref } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { COOLDOWN_TICK_MS, RESEND_COOLDOWN_SECONDS } from '../config.ts';
import { SignInMessageKey } from '../enums/sign-in-message-key.ts';
import { SignInStep } from '../enums/sign-in-step.ts';
import type { UseSignInOptions } from '../types.ts';
import { normalizeCode } from '../utils/normalize-code.ts';
import { toErrorKey } from '../utils/to-error-key.ts';
import { useCooldown } from './useCooldown.ts';

/**
 * The sign-in flow: email, then the emailed code, or Google. Everything goes through the
 * mediator; failures arrive as message keys for the screen to translate. The email and the code
 * live only in this component's state.
 */
export function useSignIn(options: UseSignInOptions) {
  const mediator = options.mediator ?? useMediator();
  const redirect = options.redirect ?? ((url: string) => window.location.assign(url));

  const step = ref(SignInStep.Email);
  const email = ref('');
  const code = ref('');
  const errorKey = ref<SignInMessageKey | undefined>();
  const noticeKey = ref<SignInMessageKey | undefined>();
  const busy = ref(false);
  const cooldown = useCooldown({ seconds: RESEND_COOLDOWN_SECONDS, tickMs: COOLDOWN_TICK_MS });

  /** One request at a time; its failure becomes the message for the current step. */
  async function run(task: () => Promise<void>) {
    if (busy.value) return;
    busy.value = true;
    errorKey.value = undefined;
    noticeKey.value = undefined;
    try {
      await task();
    } catch (error) {
      errorKey.value = toErrorKey(step.value, error);
    } finally {
      busy.value = false;
    }
  }

  function setEmail(value: string) {
    email.value = value;
    errorKey.value = undefined;
  }

  function setCode(value: string) {
    code.value = normalizeCode(value);
    errorKey.value = undefined;
  }

  const submitEmail = () =>
    run(async () => {
      const address = email.value.trim();
      await mediator.send(requestEmailCode(address));
      email.value = address;
      code.value = '';
      step.value = SignInStep.Code;
      cooldown.start();
    });

  const submitCode = () =>
    run(async () => {
      await mediator.send(verifyEmailCode(email.value, code.value));
      options.onSignedIn();
    });

  const resend = () => {
    if (cooldown.remaining.value > 0) return Promise.resolve();
    return run(async () => {
      await mediator.send(requestEmailCode(email.value));
      code.value = '';
      cooldown.start();
      noticeKey.value = SignInMessageKey.CodeResent;
    });
  };

  const signInWithGoogle = () =>
    run(async () => {
      const { redirectUrl } = await mediator.send(startGoogleSignIn(options.callbackUrl));
      redirect(redirectUrl);
    });

  function back() {
    step.value = SignInStep.Email;
    code.value = '';
    errorKey.value = undefined;
    noticeKey.value = undefined;
  }

  return {
    step,
    email,
    code,
    errorKey,
    noticeKey,
    busy,
    resendSeconds: cooldown.remaining,
    setEmail,
    setCode,
    submitEmail,
    submitCode,
    resend,
    signInWithGoogle,
    back,
  };
}
