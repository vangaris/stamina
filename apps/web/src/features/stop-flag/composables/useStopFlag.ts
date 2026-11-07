import { AppError, AppErrorCode, isQueued, reportStopFlag } from '@stamina/app-core';
import type { ReportStopFlag } from '@stamina/contracts';
import { toLocalDate } from '@stamina/dates';
import {
  StopAction,
  stopFlagEffect,
  type BodyArea,
  type ScreeningQuestion,
  type StopFlag,
} from '@stamina/domain';
import { newId } from '@stamina/ids';
import { computed, ref } from 'vue';
import type { RoutePath } from '../../../enums/route-path.ts';
import { useMediator } from '../../../mediator.ts';
import { ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { ReportStatus } from '../enums/report-status.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import { StopFlagStep } from '../enums/stop-flag-step.ts';
import type { UseStopFlagOptions } from '../types.ts';
import { createRecheckOwedStore } from '../utils/create-recheck-owed-store.ts';
import { toRouteAfterReport } from '../utils/to-route-after-report.ts';
import { toStopOutcome } from '../utils/to-stop-outcome.ts';
import { useRecheck } from './useRecheck.ts';

const NO_QUESTIONS: readonly ScreeningQuestion[] = [];

/**
 * "Anything unusual today?": the person picks a symptom (new pain also names the body area) and
 * the sheet shows at once what it does, from the domain's rules and without waiting for the
 * network, so a person with no signal is told to stop all the same. The report is sent with an id
 * made here (a retry or a replay cannot make two); with no signal it is kept on the phone, which
 * already pauses training. Then the Screening questions the flag asks again are put to the
 * person. A report that asks questions again notes on the phone that they are owed until the
 * server has them (or refuses them by a rule), so the paused screen can ask them if the sheet is
 * closed first. A referral leaves for the Referred screen, a pause for the paused screen, and a
 * stop made in a Session leaves the Session for Today. Nothing here is logged: a report is health
 * data.
 */
export function useStopFlag(options: UseStopFlagOptions) {
  const mediator = options.mediator ?? useMediator();
  const makeId = options.newId ?? newId;
  const now = options.now ?? (() => new Date());
  const recheckOwed = options.recheckOwed ?? createRecheckOwedStore(localStorage);

  const step = ref(StopFlagStep.Options);
  const flag = ref<StopFlag | undefined>();
  const area = ref<BodyArea | undefined>();
  const reportStatus = ref(ReportStatus.Idle);
  const recheck = useRecheck({
    mediator,
    onSettled: () => {
      if (flag.value) recheckOwed.settle(flag.value);
    },
  });
  const { draft, errors, errorKey, busy } = recheck;
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
    recheck.reset();
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
      if (stopFlagEffect(picked).recheck.length > 0) recheckOwed.owe(picked);
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
    recheck.reset(area.value ? [area.value] : []);
    step.value = StopFlagStep.Recheck;
  }

  /** Sends the repeated answers. The server decides the outcome of the new Screening. */
  async function submitRecheck() {
    if (step.value !== StopFlagStep.Recheck) return;
    const result = await recheck.submit(questions.value);
    if (!result) return;
    if (result.path) leave(result.path);
    else finish();
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
    answer: recheck.answer,
    setBodyAreas: recheck.setBodyAreas,
    submitRecheck,
    dismiss,
  };
}
