import { checkInvite } from '@stamina/app-core';
import { computed, ref } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { StartMessageKey } from '../enums/start-message-key.ts';
import { StartNotice } from '../enums/start-notice.ts';
import type { UseInviteStartOptions } from '../types.ts';
import { toStartErrorKey } from '../utils/to-start-error-key.ts';

/**
 * The invite screen: one code, checked through the mediator. A valid code is remembered by the
 * handler (it must survive the sign-in that comes next), so this only reports valid or not.
 * The code lives only in this component's state.
 */
export function useInviteStart(options: UseInviteStartOptions) {
  const mediator = options.mediator ?? useMediator();

  const code = ref('');
  const errorKey = ref<StartMessageKey | undefined>();
  const busy = ref(false);
  const noticeKey = computed(() =>
    options.notice === StartNotice.InviteRejected ? StartMessageKey.InviteRejected : undefined,
  );

  function setCode(value: string) {
    code.value = value;
    errorKey.value = undefined;
  }

  async function submit() {
    if (busy.value) return;
    busy.value = true;
    errorKey.value = undefined;
    try {
      const { valid } = await mediator.send(checkInvite(code.value));
      if (valid) options.onValid();
      else errorKey.value = StartMessageKey.Invalid;
    } catch (error) {
      errorKey.value = toStartErrorKey(error);
    } finally {
      busy.value = false;
    }
  }

  return { code, errorKey, noticeKey, busy, setCode, submit };
}
