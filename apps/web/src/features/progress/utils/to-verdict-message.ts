import type { Progress } from '@stamina/contracts';
import type { Locale } from '@stamina/i18n';
import { formatLoad } from '../../activity/index.ts';
import type { VerdictMessage } from '../types.ts';

/**
 * The one-sentence verdict as an i18n key (`progress.verdict.<kind>`) with its numbers. The server
 * decides the kind; the person's usual is written in their language, and is empty only when
 * there is none, which no sentence that names it is chosen for.
 */
export function toVerdictMessage(verdict: Progress['verdict'], locale: Locale): VerdictMessage {
  return {
    key: `progress.verdict.${verdict.kind}`,
    params: {
      average: verdict.average === null ? '' : formatLoad(verdict.average, locale),
      sessionsDone: verdict.sessionsDone,
      sessionsPlanned: verdict.sessionsPlanned,
    },
  };
}
