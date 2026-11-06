import {
  AppError,
  AppErrorCode,
  ProfileStatus,
  getProfile,
  getWeekLoad,
  isQueued,
  logActivity,
} from '@stamina/app-core';
import { RecordStatus, type LogActivity } from '@stamina/contracts';
import { newId } from '@stamina/ids';
import { computed, ref } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { FALLBACK_DRAFT, MESSAGE_FOR_REJECTION, ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { PlayedMessageKey } from '../enums/played-message-key.ts';
import { PlayedStatus } from '../enums/played-status.ts';
import type { PlayedDraft, UsePlayedOptions } from '../types.ts';
import { ownSportName } from '../utils/own-sport-name.ts';
import { toLoadPreview } from '../utils/to-load-preview.ts';
import { toLocalDate } from '../utils/to-local-date.ts';
import { toLogSport } from '../utils/to-log-sport.ts';
import { toPlayedDefaults } from '../utils/to-played-defaults.ts';
import { toSportOptions } from '../utils/to-sport-options.ts';

/**
 * "I played": the sheet opens with the person's own sport, usual time and effort, shows the Load
 * the draft would count for before anything is sent, and saves it in one tap with an id made
 * here (so a second tap or a replay cannot make two). With no signal the request is queued on the
 * device and the Activity is reported as saved there. After a save the week's Load is asked again.
 */
export function usePlayed(options: UsePlayedOptions) {
  const { onNavigate, sportLabel } = options;
  const mediator = options.mediator ?? useMediator();
  const makeId = options.newId ?? newId;
  const now = options.now ?? (() => new Date());

  const open = ref(false);
  const status = ref(PlayedStatus.Idle);
  const messageKey = ref<PlayedMessageKey | undefined>();
  const draft = ref<PlayedDraft>({ ...FALLBACK_DRAFT });
  const otherName = ref<string | undefined>();
  /** The Load the server (or, offline, the preview) gave the last saved Activity. */
  const savedLoad = ref<number | undefined>();
  let defaults: PlayedDraft = { ...FALLBACK_DRAFT };
  let profileRead = false;
  /** Kept across a failed try, so sending it again cannot make a second Activity. */
  let attemptId: string | undefined;

  const sportOptions = computed(() => toSportOptions(sportLabel, otherName.value));
  const preview = computed(() => toLoadPreview(draft.value.minutes, draft.value.intensity));
  const saving = computed(() => status.value === PlayedStatus.Saving);

  /** Reads the person's sport, usual time and effort. Without a profile the sheet keeps its fallback. */
  async function load() {
    try {
      const state = await mediator.send(getProfile());
      if (state.status !== ProfileStatus.Present) return;
      defaults = toPlayedDefaults(state.profile);
      otherName.value = ownSportName(state.profile);
      profileRead = true;
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        onNavigate(ROUTE_WHEN_SIGNED_OUT);
      }
      // Anything else (no signal): the fallback defaults serve, and the next open tries again.
    }
  }

  async function openSheet() {
    if (saving.value) return;
    if (!profileRead) await load();
    draft.value = { ...defaults };
    status.value = PlayedStatus.Idle;
    messageKey.value = undefined;
    attemptId = undefined;
    open.value = true;
  }

  async function refreshWeek() {
    // Best effort: the week asks for it again when it opens. Asking also refreshes the cache.
    await mediator.send(getWeekLoad()).catch(() => undefined);
  }

  function fail(key: PlayedMessageKey) {
    messageKey.value = key;
    status.value = PlayedStatus.Failed;
  }

  async function save() {
    if (saving.value) return;
    const sport = toLogSport(draft.value.sport, otherName.value);
    if (!sport) return fail(PlayedMessageKey.Failed);
    status.value = PlayedStatus.Saving;
    messageKey.value = undefined;
    attemptId ??= makeId();
    const { minutes, intensity, hot } = draft.value;
    const activity: LogActivity = {
      id: attemptId,
      sport,
      date: toLocalDate(now()),
      minutes,
      intensity,
      hot,
    };
    try {
      const result = await mediator.send(logActivity(activity));
      if (isQueued(result)) {
        savedLoad.value = toLoadPreview(minutes, intensity).load;
        status.value = PlayedStatus.Queued;
        messageKey.value = PlayedMessageKey.Queued;
      } else if (result.status === RecordStatus.Rejected) {
        attemptId = undefined;
        return fail(MESSAGE_FOR_REJECTION[result.reason]);
      } else {
        savedLoad.value = result.activity.load;
        status.value = PlayedStatus.Saved;
        messageKey.value = PlayedMessageKey.Saved;
      }
      attemptId = undefined;
      open.value = false;
      await refreshWeek();
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        status.value = PlayedStatus.Idle;
        return onNavigate(ROUTE_WHEN_SIGNED_OUT);
      }
      fail(PlayedMessageKey.Failed);
    }
  }

  return {
    open,
    status,
    messageKey,
    draft,
    sportOptions,
    preview,
    saving,
    savedLoad,
    load,
    openSheet,
    save,
  };
}
