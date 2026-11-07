import { SportKind } from '@stamina/contracts';
import { Intensity, LaunchSport, SessionFocus } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { ActivityStatus, type ActivityRowView } from '../../activity/index.ts';
import { SessionProgress } from '../../program/index.ts';
import { WIND_DOWN_AT } from '../config.ts';
import { MealSlotKind } from '../enums/meal-slot-kind.ts';
import { TimelineEntryKind } from '../enums/timeline-entry-kind.ts';
import type { TimelineMeal, TimelineSession } from '../types.ts';
import { buildTimeline } from './build-timeline.ts';

const SESSION: TimelineSession = {
  id: 's1',
  focus: SessionFocus.Lower,
  minutes: 45,
  progress: SessionProgress.NotStarted,
};

function activity(key: string): ActivityRowView {
  return {
    key,
    status: ActivityStatus.Planned,
    sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
    minutes: 60,
    intensity: Intensity.Moderate,
    load: undefined,
  };
}

function meal(id: string, at: number): TimelineMeal {
  return { id, slot: MealSlotKind.Lunch, at, title: undefined };
}

const kinds = (input: Parameters<typeof buildTimeline>[0]) =>
  buildTimeline(input).map((entry) => entry.kind);

describe('buildTimeline', () => {
  it('holds only the 22:30 wind-down for an empty day', () => {
    const [entry, ...rest] = buildTimeline({});

    expect(rest).toEqual([]);
    expect(entry).toMatchObject({ kind: TimelineEntryKind.WindDown, at: WIND_DOWN_AT });
    expect(WIND_DOWN_AT).toBe(22 * 60 + 30);
  });

  it('keeps the Session and Activities in source order before the wind-down', () => {
    const entries = buildTimeline({ session: SESSION, activities: [activity('a'), activity('b')] });

    expect(entries.map((entry) => entry.key)).toEqual([
      'session-s1',
      'activity-a',
      'activity-b',
      'wind-down',
    ]);
  });

  it('puts meals in time order whatever order they come in', () => {
    const entries = buildTimeline({ meals: [meal('dinner', 1200), meal('breakfast', 450)] });

    expect(entries.map((entry) => entry.key)).toEqual([
      'meal-breakfast',
      'meal-dinner',
      'wind-down',
    ]);
  });

  it('puts a late meal after the wind-down', () => {
    expect(buildTimeline({ meals: [meal('late', WIND_DOWN_AT + 30)] }).map((e) => e.key)).toEqual([
      'wind-down',
      'meal-late',
    ]);
  });

  it('draws water only when its data is given', () => {
    expect(kinds({})).not.toContain(TimelineEntryKind.Water);
    expect(kinds({ water: { ml: 500, targetMl: 2000 } })).toEqual([
      TimelineEntryKind.Water,
      TimelineEntryKind.WindDown,
    ]);
  });

  it('draws no meals when none are given', () => {
    expect(kinds({ session: SESSION })).toEqual([
      TimelineEntryKind.Session,
      TimelineEntryKind.WindDown,
    ]);
  });

  it('lists every kind together', () => {
    expect(
      kinds({
        session: SESSION,
        activities: [activity('a')],
        water: { ml: 0, targetMl: 2000 },
        meals: [meal('lunch', 780)],
      }),
    ).toEqual([
      TimelineEntryKind.Session,
      TimelineEntryKind.Activity,
      TimelineEntryKind.Water,
      TimelineEntryKind.MealSlot,
      TimelineEntryKind.WindDown,
    ]);
  });
});
