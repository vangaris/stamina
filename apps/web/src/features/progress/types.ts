import type { Mediator } from '@stamina/app-core';
import type { Progress } from '@stamina/contracts';
import type { Locale } from '@stamina/i18n';
import type { LoadBarsWeek } from '@stamina/ui-load-bars';
import type { RoutePath } from '../../enums/route-path.ts';
import type { WeighInMessageKey } from './enums/weigh-in-message-key.ts';
import type { WeighInStatus } from './enums/weigh-in-status.ts';

export interface UseProgressOptions {
  /** Called when the person must sign in again. */
  onNavigate: (path: RoutePath) => void;
  /** The person's language, read when a date or number is written. */
  locale: () => Locale;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** The time now, for "today" on the person's calendar. Defaults to the browser's clock. */
  now?: () => Date;
}

/** The verdict sentence: its i18n key and the numbers it is filled with, written in the person's language. */
export interface VerdictMessage {
  key: string;
  params: { average: string; sessionsDone: number; sessionsPlanned: number };
}

export type WeighIn = Progress['weighIn'];

export interface ProgressCountProps {
  /** The heading and the accessible name of the bar. */
  label: string;
  /** What the bar says in words, shown under it. */
  valueText: string;
  done: number;
  planned: number;
}

export interface ProgressLoadCardProps {
  weeks: LoadBarsWeek[];
  /** The person's usual Load per week; nothing draws no line. */
  average: number | null;
  /** The person's language, the numbers are written in it. */
  locale: Locale;
}

export interface ProgressVerdictProps {
  message: VerdictMessage;
}

export interface WeighInCardProps {
  latest: WeighIn['latest'];
  /** No weigh-in this week yet: the card offers one. */
  due: boolean;
  locale: Locale;
  saving: boolean;
  status: WeighInStatus;
  messageKey: WeighInMessageKey | undefined;
}

export interface WeighInCardEmits {
  (event: 'submit'): void;
}
