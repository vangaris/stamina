import type { Mediator } from '@stamina/app-core';
import type { LogActivity, SportKind } from '@stamina/contracts';
import type { Intensity, LaunchSport } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { SelectOption } from '@stamina/ui-select';
import type { RoutePath } from '../../enums/route-path.ts';
import type { ActivityStatus } from './enums/activity-status.ts';
import type { PlayedMessageKey } from './enums/played-message-key.ts';

/** The sport as the person gave it: a launch sport or a name of their own. */
export type ActivitySport = LogActivity['sport'];

/** What the sport select holds: a launch sport, or the person's own other sport. */
export type SportChoice = LaunchSport | SportKind.Other;

/** What the "I played" sheet shows and the person edits. */
export interface PlayedDraft {
  sport: SportChoice;
  minutes: number;
  intensity: Intensity;
  hot: boolean;
}

/** The Load a draft would count for: minutes times the effort's RPE. */
export interface LoadPreview {
  minutes: number;
  rpe: number;
  load: number;
}

export interface UsePlayedOptions {
  /** Called when the person must sign in again. */
  onNavigate: (path: RoutePath) => void;
  /** Names a launch sport in the person's language. */
  sportLabel: (sport: LaunchSport) => string;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** Makes the id of an Activity. Defaults to `newId`. */
  newId?: () => string;
  /** The time now, for "today" on the person's calendar. Defaults to the browser's clock. */
  now?: () => Date;
}

export interface PlayedSheetProps {
  sportOptions: SelectOption[];
  preview: LoadPreview;
  saving: boolean;
  errorKey: PlayedMessageKey | undefined;
}

export interface PlayedSheetEmits {
  (event: 'save'): void;
}

/** One Activity on a day of the week, planned or played. */
export interface ActivityRowView {
  /** Stable across renders. */
  key: string;
  status: ActivityStatus;
  sport: ActivitySport;
  minutes: number;
  intensity: Intensity;
  /** Its Load once played. Nothing while it is only planned. */
  load: number | undefined;
}

export interface ActivityRowProps {
  activity: ActivityRowView;
}

/** Activities of the shown week by date (`YYYY-MM-DD`), planned first. */
export type ActivitiesByDate = Readonly<Record<string, ActivityRowView[]>>;

export interface LoadSummaryView {
  load: number;
  /** Null until an earlier week has data. */
  average: number | null;
}

export interface LoadSummaryProps {
  summary: LoadSummaryView;
  locale: Locale;
}
