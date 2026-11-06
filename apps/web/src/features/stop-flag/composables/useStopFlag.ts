import {
  AppError,
  AppErrorCode,
  isQueued,
  recheckScreening,
  reportStopFlag,
} from '@stamina/app-core';
import { RecordStatus, type ReportStopFlag } from '@stamina/contracts';
import { toLocalDate } from '@stamina/dates';
import {
  StopAction,
  TrainingMode,
  stopFlagEffect,
  type BodyArea,
  type ScreeningQuestion,
  type StopFlag,
} from '@stamina/domain';
import { newId } from '@stamina/ids';
import { computed, ref } from 'vue';
import { RoutePath } from '../../../enums/route-path.ts';
import { useMediator } from '../../../mediator.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { applyAnswer, createScreeningDraft } from '../../safety/index.ts';
import { RECHECK_ERROR_KEYS, RECHECK_REJECTION_ROUTES, ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { ReportStatus } from '../enums/report-status.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import { StopFlagStep } from '../enums/stop-flag-step.ts';
import type { RecheckDraft, RecheckErrors, UseStopFlagOptions } from '../types.ts';
import { toRecheckSubmission } from '../utils/to-recheck-submission.ts';
import { toRouteAfterReport } from '../utils/to-route-after-report.ts';
import { toStopOutcome } from '../utils/to-stop-outcome.ts';
import { validateRecheck } from '../utils/validate-recheck.ts';

const NO_ERRORS: RecheckErrors = { answers: {} };
const NO_QUESTIONS: readonly ScreeningQuestion[] = [];

/**
 * "Anything unusual today?": the person picks a symptom (new pain also names the body area) and
 * the sheet shows at once what it does, from the domain's rules and without waiting for the
 * network, so a person with no signal is told to stop all the same. The report is sent with an id
 * made here (a retry or a replay cannot make two); with no signal it is kept on the phone, which
 * already pauses training. Then the Screening questions the flag asks again are put to the
 * person. A referral leaves for the Referred screen, a pause for the paused screen, and a stop
 * made in a Session leaves the Session for Today. Nothing here is logged: a report is health data.
 */
export function useStopFlag(options: UseStopFlagOptions) {
  const mediator = options.mediator ?? useMediator();
  const makeId = options.newId ?? newId;
  const now = options.now ?? (() => new Date());

  const step = ref(StopFlagStep.Options);
  const flag = ref<StopFlag | undefined>();
  const area = ref<BodyArea | undefined>();
  const reportStatus = ref(ReportStatus.Idle);
  const draft = ref<RecheckDraft>(createScreeningDraft());
  const errors = ref<RecheckErrors>(NO_ERRORS);
  const errorKey = ref<StopFlagMessageKey | undefined>();
  const busy = ref(false);
  /** Kept across a failed try, so sending the report again cannot make a second one. */
  let attemptId: string | undefined;

  /** A flag was picked and shown: closing the sheet now still leaves the person where the flag puts them. */
  const reported = computed(
    () =>
      flag.value !== undefined &&
      (step.value === StopFlagStep.Outcome || step.value === StopFlagStep.Recheck),
  );
  const outcome = computed(() =>
    reported.value && flag.value ? toStopOutcome(flag.value, area.value) : undefined,
  );
  const questions = computed(() =>
    flag.value ? stopFlagEffect(flag.value).recheck : NO_QUESTIONS,
  );
  /** Only a report that is saved (here or on the phone) lets the person go on: a failed one is tried again first. */
  const canContinue = computed(
    () => reportStatus.value === ReportStatus.Saved || reportStatus.value === ReportStatus.Queued,
  );
  const reportKey = computed(() => {
    if (reportStatus.value === ReportStatus.Queued) return StopFlagMessageKey.ReportQueued;
    if (reportStatus.value === ReportStatus.Failed) return StopFlagMessageKey.ReportFailed;
    return undefined;
  });

  /** Back to the list of options, with nothing picked. */
  function reset() {
    step.value = StopFlagStep.Options;
    flag.value = undefined;
    area.value = undefined;
    reportStatus.value = ReportStatus.Idle;
    draft.value = createScreeningDraft();
    errors.value = NO_ERRORS;
    errorKey.value = undefined;
    busy.value = false;
    attemptId = undefined;
  }

  async function sendReport() {
    const picked = flag.value;
    if (!picked) return;
    step.value = StopFlagStep.Outcome;
    reportStatus.value = ReportStatus.Sending;
    const id = (attemptId ??= makeId());
    const sessionId = options.sessionId?.();
    const report: ReportStopFlag = {
      id,
      flag: picked,
      date: toLocalDate(now()),
      ...(area.value ? { bodyArea: area.value } : {}),
      ...(sessionId ? { sessionId } : {}),
    };
    try {
      const result = await mediator.send(reportStopFlag(report));
      if (attemptId !== id) return;
      reportStatus.value = isQueued(result) ? ReportStatus.Queued : ReportStatus.Saved;
    } catch (error) {
      if (attemptId !== id) return;
      reportStatus.value = ReportStatus.Failed;
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        options.onNavigate(ROUTE_WHEN_SIGNED_OUT);
      }
    }
  }

  /** One tap on an option. New pain asks for the area first; every other flag is reported at once. */
  async function pick(picked: StopFlag) {
    if (step.value !== StopFlagStep.Options) return;
    flag.value = picked;
    if (stopFlagEffect(picked).action === StopAction.ExcludeArea) {
      step.value = StopFlagStep.Area;
      return;
    }
    await sendReport();
  }

  /** The area of a new pain; reports it. */
  async function pickArea(picked: BodyArea) {
    if (step.value !== StopFlagStep.Area) return;
    area.value = picked;
    await sendReport();
  }

  /** From the area back to the options. */
  function back() {
    if (step.value !== StopFlagStep.Area) return;
    reset();
  }

  /** Sends the report again after it failed; the same id, so the server never has it twice. */
  async function retry() {
    if (reportStatus.value !== ReportStatus.Failed) return;
    await sendReport();
  }

  /** Leaves for `path` (if any) and closes the sheet. */
  function leave(path?: RoutePath) {
    reset();
    if (path) options.onNavigate(path);
    options.onDone();
  }

  /** The report is done with: wherever its outcome puts the person next. */
  function finish() {
    const kind = outcome.value?.kind;
    leave(kind ? toRouteAfterReport(kind, !!options.sessionId?.()) : undefined);
  }

  /** Goes from the outcome on to the repeated questions, or finishes when the flag asks none. */
  function continueFromOutcome() {
    if (step.value !== StopFlagStep.Outcome || !canContinue.value) return;
    if (questions.value.length === 0) {
      finish();
      return;
    }
    draft.value = { ...createScreeningDraft(), bodyAreas: area.value ? [area.value] : [] };
    errors.value = NO_ERRORS;
    errorKey.value = undefined;
    step.value = StopFlagStep.Recheck;
  }

  function answer(question: ScreeningQuestion, value: boolean) {
    draft.value = applyAnswer(draft.value, question, value);
    errors.value = { answers: omitKey(errors.value.answers, question) };
    errorKey.value = undefined;
  }

  function setBodyAreas(areas: BodyArea[]) {
    draft.value = { ...draft.value, bodyAreas: areas };
    errors.value = { answers: errors.value.answers };
    errorKey.value = undefined;
  }

  /** Sends the repeated answers. The server decides the outcome of the new Screening. */
  async function submitRecheck() {
    if (busy.value || step.value !== StopFlagStep.Recheck) return;
    errorKey.value = undefined;
    errors.value = validateRecheck(questions.value, draft.value);
    if (Object.keys(errors.value.answers).length > 0 || errors.value.bodyAreas) return;
    const submission = toRecheckSubmission(questions.value, draft.value);
    if (!submission) {
      errorKey.value = StopFlagMessageKey.RecheckUnknown;
      return;
    }

    busy.value = true;
    try {
      const result = await mediator.send(recheckScreening(submission));
      if (result.status === RecordStatus.Rejected) {
        return leave(RECHECK_REJECTION_ROUTES[result.reason]);
      }
      if (result.screening.trainingMode === TrainingMode.Referred) {
        return leave(RoutePath.Referred);
      }
      finish();
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return leave(ROUTE_WHEN_SIGNED_OUT);
      }
      errorKey.value = toMessageKey(error, RECHECK_ERROR_KEYS, StopFlagMessageKey.RecheckUnknown);
    } finally {
      busy.value = false;
    }
  }

  /** The sheet was closed. A flag that was shown still takes the person where it puts them. */
  function dismiss() {
    if (reported.value) finish();
    else reset();
  }

  return {
    step,
    flag,
    area,
    outcome,
    questions,
    draft,
    errors,
    errorKey,
    reportStatus,
    reportKey,
    canContinue,
    busy,
    reset,
    pick,
    pickArea,
    back,
    retry,
    continueFromOutcome,
    answer,
    setBodyAreas,
    submitRecheck,
    dismiss,
  };
}

function omitKey<K extends string, V>(
  record: Partial<Record<K, V>>,
  key: K,
): Partial<Record<K, V>> {
  return Object.fromEntries(Object.entries(record).filter(([entry]) => entry !== key)) as Partial<
    Record<K, V>
  >;
}
