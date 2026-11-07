import { VerdictKind } from '@stamina/domain';
import { z } from 'zod';

const isoDate = z.iso.date();
const count = z.number().int().min(0);

/**
 * One week of the Load bars. `done` is the Load already done (Sessions plus Activities);
 * `planned` is the extra Load still to come in that week: the Sessions not finished and the
 * planned Activities not logged on a play day that is today or later (a play day that has
 * passed unlogged is not still to come, so earlier weeks have none), drawn dashed on top of `done`.
 */
export const progressWeekSchema = z.object({
  startsOn: isoDate,
  done: count,
  planned: count,
});

/** The week's verdict as the server decided it; clients only word it. */
export const progressVerdictSchema = z.object({
  kind: z.enum(VerdictKind),
  /** The week's Load as the verdict weighed it: done plus planned. */
  load: count,
  /** The average of the weeks before, or null while there is none. */
  average: count.nullable(),
  sessionsDone: count,
  sessionsPlanned: count,
});

/** The signed-in user's latest weigh-in (kilograms), and whether this week has one yet. */
export const progressWeighInSchema = z.object({
  latest: z.object({ date: isoDate, weightKg: z.number() }).nullable(),
  /** No weigh-in is dated in the current week. */
  due: z.boolean(),
});

/**
 * `GET /progress`: how the week that holds today is going against the person's own usual.
 * `sessions.planned` and `activities.planned` count everything planned in the week (done or
 * not); `activities.logged` counts every Activity logged in it. `weeks` is oldest first: up to
 * four earlier weeks that hold data, then the current week last. `average` is the average of the
 * weeks before this one, null until one has data.
 */
export const progressSchema = z.object({
  weekStartsOn: isoDate,
  sessions: z.object({ done: count, planned: count }),
  activities: z.object({ logged: count, planned: count }),
  weeks: z.array(progressWeekSchema),
  average: count.nullable(),
  verdict: progressVerdictSchema,
  weighIn: progressWeighInSchema,
});
