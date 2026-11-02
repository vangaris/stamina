import { AppError, AppErrorCode, grantConsent, SafetyStatus } from '@stamina/app-core';
import { ConsentPurpose } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import { ref } from 'vue';
import { i18n } from '../../../i18n.ts';
import { RoutePath } from '../../../enums/route-path.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { CONSENT_ERROR_FIELDS, CONSENT_PURPOSES, CONSENT_REQUIRED_KEYS } from '../config.ts';
import { SafetyMessageKey } from '../enums/safety-message-key.ts';
import type { ConsentErrors, UseConsentOptions } from '../types.ts';
import { useSafetyRoute } from './useSafetyRoute.ts';

const SAVE_ERROR_KEYS = { [AppErrorCode.Offline]: SafetyMessageKey.ConsentOffline };

/**
 * The consent screen: the disclaimer and, separately, consent to health data. Both boxes start
 * unticked and both must be ticked; each is then sent as its own consent in the language the
 * texts were read in. The boxes' state is the only thing held here.
 */
export function useConsent(options: UseConsentOptions) {
  const locale: () => Locale = options.locale ?? (() => i18n.global.locale.value);
  const route = useSafetyRoute(SafetyStatus.ConsentNeeded, options);

  const accepted = ref<Record<ConsentPurpose, boolean>>({
    [ConsentPurpose.Disclaimer]: false,
    [ConsentPurpose.HealthData]: false,
  });
  const errors = ref<ConsentErrors>({});
  const errorKey = ref<SafetyMessageKey | undefined>();
  const busy = ref(false);

  function setAccepted(purpose: ConsentPurpose, value: boolean) {
    accepted.value = { ...accepted.value, [purpose]: value };
    errors.value = { ...errors.value, [CONSENT_ERROR_FIELDS[purpose]]: undefined };
    errorKey.value = undefined;
  }

  async function submit() {
    if (busy.value) return;
    errorKey.value = undefined;
    const next: ConsentErrors = {};
    for (const purpose of CONSENT_PURPOSES) {
      if (!accepted.value[purpose])
        next[CONSENT_ERROR_FIELDS[purpose]] = CONSENT_REQUIRED_KEYS[purpose];
    }
    errors.value = next;
    if (Object.keys(next).length > 0) return;

    busy.value = true;
    try {
      for (const purpose of CONSENT_PURPOSES) {
        await route.mediator.send(grantConsent({ purpose, locale: locale() }));
      }
      options.onNavigate(RoutePath.Screening);
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return options.onNavigate(RoutePath.Start);
      }
      errorKey.value = toMessageKey(error, SAVE_ERROR_KEYS, SafetyMessageKey.ConsentUnknown);
    } finally {
      busy.value = false;
    }
  }

  return {
    phase: route.phase,
    accepted,
    errors,
    errorKey,
    busy,
    load: route.load,
    setAccepted,
    submit,
  };
}
