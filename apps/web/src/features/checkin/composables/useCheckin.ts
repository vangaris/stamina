import {
  AppError,
  AppErrorCode,
  getLatestCheckin,
  isQueued,
  submitCheckin,
} from '@stamina/app-core';
import { toLocalDate } from '@stamina/dates';
import { newId } from '@stamina/ids';
import { computed, ref } from 'vue';
import { useMediator } from '../../../mediator.ts';
import {
  ASKING_STATUSES,
  CHECKIN_QUESTIONS,
  DONE_STATUSES,
  ROUTE_WHEN_SIGNED_OUT,
} from '../config.ts';
import { CheckinMessageKey } from '../enums/checkin-message-key.ts';
import { CheckinStatus } from '../enums/checkin-status.ts';
import type { CheckinAnswers, CheckinDraft, UseCheckinOptions } from '../types.ts';
import { toSubmitCheckin } from '../utils/to-submit-checkin.ts';

const LAST_STEP = CHECKIN_QUESTIONS.length - 1;

function toAnswers({ sleep, soreness, energy }: CheckinAnswers): CheckinAnswers {
  return { sleep, soreness, energy };
}

/**
 * The daily Check-in on Today: one question at a time, and the third answer sends it at once with
 * an id made here (a second tap or a replay cannot make two). Without signal the request is queued
 * and the Check-in reported as saved on the phone. A failed send keeps the answers and the id for
 * the retry. Once today's Check-in is in, the card is done; its "anything unusual" row opens the
 * stop-flag reporter or finishes.
 */
export function useCheckin(options: UseCheckinOptions) {
  const { onNavigate } = options;
  const mediator = options.mediator ?? useMediator();
  const makeId = options.newId ?? newId;
  const now = options.now ?? (() => new Date());

  const status = ref(CheckinStatus.Loading);
  const step = ref(0);
  const draft = ref<CheckinDraft>({});
  /** What today's Check-in says: sent just now, or found when the card loaded. */
  const sent = ref<CheckinAnswers | undefined>();
  const messageKey = ref<CheckinMessageKey | undefined>();
  const unusualOpen = ref(false);
  const unusualDone = ref(false);
  /** Kept across a failed try, so sending it again cannot make a second Check-in. */
  let attemptId: string | undefined;

  const question = computed(() => CHECKIN_QUESTIONS[step.value]!);
  const selected = computed(() => draft.value[question.value]);
  const asking = computed(() => ASKING_STATUSES.includes(status.value));
  const done = computed(() => DONE_STATUSES.includes(status.value));
  const sending = computed(() => status.value === CheckinStatus.Sending);
  const errorKey = computed(() =>
    status.value === CheckinStatus.Failed ? CheckinMessageKey.Failed : undefined,
  );
  /** The place of the question, from 1. */
  const position = computed(() => step.value + 1);
  const canGoBack = computed(() => step.value > 0 && !sending.value);

  /** Finds out whether today's Check-in is in; if not, the questions start. */
  async function load() {
    try {
      const latest = await mediator.send(getLatestCheckin());
      if (latest && latest.date === toLocalDate(now())) {
        sent.value = toAnswers(latest);
        messageKey.value = CheckinMessageKey.Saved;
        status.value = CheckinStatus.Answered;
        return;
      }
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        onNavigate(ROUTE_WHEN_SIGNED_OUT);
      }
      // Anything else (no signal, first open): ask the questions.
    }
    status.value = CheckinStatus.Asking;
  }

  function fail(error?: unknown) {
    status.value = CheckinStatus.Failed;
    messageKey.value = CheckinMessageKey.Failed;
    if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
      onNavigate(ROUTE_WHEN_SIGNED_OUT);
    }
  }

  async function send() {
    if (sending.value) return;
    const id = attemptId ?? makeId();
    const checkin = toSubmitCheckin(id, toLocalDate(now()), draft.value);
    if (!checkin) return;
    attemptId = id;
    status.value = CheckinStatus.Sending;
    messageKey.value = undefined;
    try {
      const result = await mediator.send(submitCheckin(checkin));
      if (isQueued(result)) {
        sent.value = toAnswers(checkin);
        status.value = CheckinStatus.Queued;
        messageKey.value = CheckinMessageKey.Queued;
      } else {
        sent.value = toAnswers(result.checkin);
        status.value = CheckinStatus.Saved;
        messageKey.value = CheckinMessageKey.Saved;
      }
      attemptId = undefined;
    } catch (error) {
      fail(error);
    }
  }

  /** Records an answer: the next question follows, and the third answer sends the Check-in. */
  async function answer(score: number) {
    if (!asking.value || sending.value) return;
    const key = question.value;
    // A changed answer is a different Check-in: it must not reuse the id of a failed try.
    if (draft.value[key] !== score) attemptId = undefined;
    draft.value = { ...draft.value, [key]: score };
    if (step.value < LAST_STEP) {
      step.value += 1;
      return;
    }
    await send();
  }

  /** Back to the question before, to change its answer. */
  function back() {
    if (!canGoBack.value) return;
    step.value -= 1;
    status.value = CheckinStatus.Asking;
    messageKey.value = undefined;
  }

  function openUnusual() {
    unusualOpen.value = true;
  }

  function nothingUnusual() {
    unusualDone.value = true;
  }

  function reportedUnusual() {
    unusualOpen.value = false;
    unusualDone.value = true;
  }

  return {
    status,
    position,
    question,
    selected,
    sent,
    messageKey,
    asking,
    done,
    sending,
    canGoBack,
    errorKey,
    unusualOpen,
    unusualDone,
    load,
    answer,
    back,
    retry: send,
    openUnusual,
    nothingUnusual,
    reportedUnusual,
  };
}
