import type { Mediator } from '@stamina/app-core';
import type { SessionFocus } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { ActivityRowView, LoadSummaryView } from '../activity/index.ts';
import type { SessionProgress } from '../program/index.ts';
import type { RoutePath } from '../../enums/route-path.ts';
import type { MealSlotKind } from './enums/meal-slot-kind.ts';
import type { TimelineEntryKind } from './enums/timeline-entry-kind.ts';

/** Today's Session as the timeline shows it. */
export interface TimelineSession {
  id: string;
  focus: SessionFocus;
  minutes: number;
  progress: SessionProgress;
}

/** One meal slot of the day. Nutrition supplies these; Today only draws them. */
export interface TimelineMeal {
  id: string;
  slot: MealSlotKind;
  /** When it is eaten, as a minute of the day. */
  at: number;
  /** The meal idea for the slot, if there is one. */
  title: string | undefined;
}

/** Water drunk so far today against the day's target, in millilitres. */
export interface TimelineWater {
  ml: number;
  targetMl: number;
}

/** The data Nutrition adds to Today's timeline; nothing is drawn for what is left out. */
export interface TimelineExtras {
  meals?: readonly TimelineMeal[] | undefined;
  water?: TimelineWater | undefined;
}

export interface TimelineInput extends TimelineExtras {
  session?: TimelineSession | undefined;
  activities?: readonly ActivityRowView[] | undefined;
}

interface TimelineEntryBase {
  /** Stable across renders. */
  key: string;
  /** A minute of the day. Nothing: it has no time of its own and keeps its place in the source order. */
  at: number | undefined;
}

export type TimelineEntry =
  | (TimelineEntryBase & { kind: TimelineEntryKind.Session; session: TimelineSession })
  | (TimelineEntryBase & { kind: TimelineEntryKind.Activity; activity: ActivityRowView })
  | (TimelineEntryBase & { kind: TimelineEntryKind.Water; water: TimelineWater })
  | (TimelineEntryBase & { kind: TimelineEntryKind.MealSlot; meal: TimelineMeal })
  | (TimelineEntryBase & { kind: TimelineEntryKind.WindDown });

export interface UseTodayOptions {
  /** Called when the person must sign in again. */
  onNavigate: (path: RoutePath) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** The time now, for "today" on the person's calendar. Defaults to the browser's clock. */
  now?: () => Date;
  /** The meals and water to draw, read each time the timeline is built. */
  extras?: () => TimelineExtras;
}

export interface TodayHeaderProps {
  /** `YYYY-MM-DD`. */
  date: string;
  locale: Locale;
  /** This week's Load and the person's usual, once the week is known. */
  summary: LoadSummaryView | undefined;
}

export interface TodayTimelineProps {
  entries: readonly TimelineEntry[];
  locale: Locale;
}

export interface TimelineSessionEntryProps {
  session: TimelineSession;
}

export interface TimelineActivityEntryProps {
  activity: ActivityRowView;
}

export interface TimelineMealEntryProps {
  meal: TimelineMeal;
}

export interface TimelineWaterEntryProps {
  water: TimelineWater;
}
