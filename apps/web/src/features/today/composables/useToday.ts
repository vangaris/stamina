import {
  AppError,
  AppErrorCode,
  getProgram,
  getSessionDetail,
  getWeekLoad,
} from '@stamina/app-core';
import type { ProgramWeek, WeekLoad } from '@stamina/contracts';
import { toLocalDate } from '@stamina/dates';
import { computed, ref, shallowRef } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { groupActivitiesByDate, toLoadSummary } from '../../activity/index.ts';
import { SessionProgress, toSessionProgress } from '../../program/index.ts';
import { ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { TodayStatus } from '../enums/today-status.ts';
import type { TimelineSession, UseTodayOptions } from '../types.ts';
import { buildTimeline } from '../utils/build-timeline.ts';
import { findTodaySession } from '../utils/find-today-session.ts';

const isUnauthorized = (reason: unknown) =>
  reason instanceof AppError && reason.code === AppErrorCode.Unauthorized;

/**
 * The person's day: today's Session (and where it stands), today's Activities and the week's Load,
 * put in one timeline. The three are read independently and a read that fails (no signal, nothing
 * stored) leaves its part out; only when the Program and the week both fail is the day `Failed`.
 * Asking again refreshes it, for instance after an Activity was saved.
 */
export function useToday(options: UseTodayOptions) {
  const mediator = options.mediator ?? useMediator();
  const now = options.now ?? (() => new Date());

  const status = ref(TodayStatus.Loading);
  const date = ref(toLocalDate(now()));
  const program = shallowRef<ProgramWeek | null>(null);
  const weekLoad = shallowRef<WeekLoad | undefined>();
  const progress = ref<SessionProgress | undefined>();

  const session = computed<TimelineSession | undefined>(() => {
    const found = findTodaySession(program.value, date.value);
    return found && progress.value
      ? { id: found.id, focus: found.focus, minutes: found.minutes, progress: progress.value }
      : undefined;
  });
  const entries = computed(() =>
    buildTimeline({
      session: session.value,
      activities: weekLoad.value ? groupActivitiesByDate(weekLoad.value)[date.value] : undefined,
      ...options.extras?.(),
    }),
  );
  const summary = computed(() => (weekLoad.value ? toLoadSummary(weekLoad.value) : undefined));

  async function load() {
    if (status.value === TodayStatus.Failed) status.value = TodayStatus.Loading;
    date.value = toLocalDate(now());
    const [programResult, weekResult] = await Promise.allSettled([
      mediator.send(getProgram()),
      mediator.send(getWeekLoad()),
    ]);
    const unauthorized = [programResult, weekResult].some(
      (result) => result.status === 'rejected' && isUnauthorized(result.reason),
    );
    if (unauthorized) return options.onNavigate(ROUTE_WHEN_SIGNED_OUT);

    if (programResult.status === 'fulfilled') program.value = programResult.value;
    if (weekResult.status === 'fulfilled') weekLoad.value = weekResult.value;
    status.value =
      programResult.status === 'rejected' && weekResult.status === 'rejected'
        ? TodayStatus.Failed
        : TodayStatus.Ready;

    const today = findTodaySession(program.value, date.value);
    if (!today) {
      progress.value = undefined;
      return;
    }
    // Best effort: without the detail the Session is not started as far as Today can tell.
    const detail = await mediator.send(getSessionDetail(today.id)).catch(() => undefined);
    progress.value = toSessionProgress(today.status, detail);
  }

  return { status, date, entries, summary, load };
}
