import type { Mediator } from '@stamina/app-core';
import type { Weekday } from '@stamina/domain';
import type { RoutePath } from '../../enums/route-path.ts';
import type { AdaptationCardState } from './enums/adaptation-card-state.ts';

/** An i18n key and the named arguments that fill it. */
export interface MessageSpec {
  key: string;
  params: Readonly<Record<string, string | number>>;
}

/** One suggestion as its card shows it. */
export interface AdaptationCardView {
  id: string;
  state: AdaptationCardState;
  /** What accepting changes. */
  change: MessageSpec;
  /** Why it is suggested. */
  reason: MessageSpec;
}

export interface UseAdaptationsOptions {
  /** Called when the person must sign in again. */
  onNavigate: (path: RoutePath) => void;
  /** Names a weekday in the person's language. */
  weekdayLabel: (weekday: Weekday) => string;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
}
