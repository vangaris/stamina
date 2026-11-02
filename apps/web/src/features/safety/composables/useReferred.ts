import {
  AppError,
  AppErrorCode,
  deleteAccount,
  exportData,
  recordDoctorOk,
  SafetyStatus,
  signOut,
} from '@stamina/app-core';
import { RecordStatus } from '@stamina/contracts';
import { ReferralKind } from '@stamina/domain';
import { computed, ref } from 'vue';
import { RoutePath } from '../../../enums/route-path.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { EXPORT_FILE_NAME } from '../config.ts';
import { ReferredView } from '../enums/referred-view.ts';
import { SafetyMessageKey } from '../enums/safety-message-key.ts';
import type { UseReferredOptions } from '../types.ts';
import { downloadJson } from '../utils/download-json.ts';
import { useSafetyRoute } from './useSafetyRoute.ts';

const ERROR_KEYS = { [AppErrorCode.Offline]: SafetyMessageKey.ReferredOffline };

/**
 * The Referred screen. It names no condition: the wording depends only on whether the referral
 * was for pregnancy (a doctor or midwife, and no "a doctor has said I can train"). From here a
 * person can export their data, delete everything (after a confirmation, then they are signed
 * out) or, after a general referral, state that a doctor has said they can train, which records
 * the statement and turns on Limited mode. Never logs the data it handles.
 */
export function useReferred(options: UseReferredOptions) {
  const save = options.save ?? downloadJson;
  const route = useSafetyRoute(SafetyStatus.Referred, options);

  const view = ref(ReferredView.Referral);
  const errorKey = ref<SafetyMessageKey | undefined>();
  const exported = ref(false);
  const busy = ref(false);

  const isPregnancy = computed(
    () =>
      route.state.value?.status === SafetyStatus.Referred &&
      route.state.value.screening.referral === ReferralKind.Pregnancy,
  );

  /** Runs one button's work: busy meanwhile, a message for what fails, back to the start if signed out. */
  async function run(work: () => Promise<void>) {
    if (busy.value) return;
    busy.value = true;
    errorKey.value = undefined;
    try {
      await work();
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return options.onNavigate(RoutePath.Start);
      }
      errorKey.value = toMessageKey(error, ERROR_KEYS, SafetyMessageKey.ReferredUnknown);
    } finally {
      busy.value = false;
    }
  }

  const exportMyData = () =>
    run(async () => {
      save(EXPORT_FILE_NAME, await route.mediator.send(exportData()));
      exported.value = true;
    });

  function askToDelete() {
    exported.value = false;
    errorKey.value = undefined;
    view.value = ReferredView.ConfirmDelete;
  }

  function keepData() {
    errorKey.value = undefined;
    view.value = ReferredView.Referral;
  }

  const confirmDelete = () =>
    run(async () => {
      await route.mediator.send(deleteAccount());
      // The data is gone; failing to end the session must not look like failing to delete.
      await route.mediator.send(signOut()).catch(() => undefined);
      options.onNavigate(RoutePath.Start);
    });

  const stateDoctorOk = () =>
    run(async () => {
      exported.value = false;
      const result = await route.mediator.send(recordDoctorOk());
      // Rejected: the server says this is not a general referral; show where the person belongs.
      if (result.status === RecordStatus.Rejected) return route.load();
      view.value = ReferredView.Limited;
    });

  const leave = () =>
    run(async () => {
      await route.mediator.send(signOut());
      options.onNavigate(RoutePath.Start);
    });

  function continueToToday() {
    options.onNavigate(RoutePath.Today);
  }

  return {
    phase: route.phase,
    view,
    isPregnancy,
    errorKey,
    exported,
    busy,
    load: route.load,
    exportMyData,
    askToDelete,
    keepData,
    confirmDelete,
    stateDoctorOk,
    signOut: leave,
    continueToToday,
  };
}
