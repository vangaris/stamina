import { AppError, AppErrorCode, RequestType } from '@stamina/app-core';
import { SportKind } from '@stamina/contracts';
import { Intensity, LaunchSport, activityLoad } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { PlayedMessageKey } from '../enums/played-message-key.ts';
import { PlayedStatus } from '../enums/played-status.ts';
import { QUEUED, REJECTED } from '../testing/create-mock-mediator.ts';
import { makeSavedProfile } from '../testing/make-saved-profile.ts';
import { makeWeekLoad } from '../testing/make-week-load.ts';
import { setupPlayed } from '../testing/setup-played.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function opened(setup = setupPlayed()) {
  await setup.flow.openSheet();
  return setup;
}

describe('opening the sheet', () => {
  it("starts from the profile's sport, usual time, effort and hot conditions", async () => {
    const setup = setupPlayed();
    setup.setProfile(
      makeSavedProfile({
        sport: { kind: SportKind.Launch, sport: LaunchSport.Kitesurfing },
        playMinutes: 120,
        playIntensity: Intensity.Hard,
        hotConditionsDefault: true,
      }),
    );

    const { flow } = await opened(setup);

    expect(flow.open.value).toBe(true);
    expect(flow.draft.value).toEqual({
      sport: LaunchSport.Kitesurfing,
      minutes: 120,
      intensity: Intensity.Hard,
      hot: true,
    });
  });

  it("offers the person's own sport, by its name, when the profile has one", async () => {
    const setup = setupPlayed();
    setup.setProfile(makeSavedProfile({ sport: { kind: SportKind.Other, name: 'Squash' } }));

    const { flow } = await opened(setup);

    expect(flow.draft.value.sport).toBe(SportKind.Other);
    expect(flow.sportOptions.value.at(-1)).toEqual({ value: SportKind.Other, label: 'Squash' });
  });

  it('only offers the launch sports for a launch sport profile', async () => {
    const { flow } = await opened();

    expect(flow.sportOptions.value.map(({ value }) => value)).toEqual(Object.values(LaunchSport));
  });

  it('still opens, on sensible defaults, when the profile cannot be read', async () => {
    const setup = setupPlayed();
    setup.state.profileError = new AppError(AppErrorCode.Offline);

    const { flow } = await opened(setup);

    expect(flow.open.value).toBe(true);
    expect(flow.draft.value.minutes).toBeGreaterThan(0);
  });
});

describe('the Load preview', () => {
  it('updates as the person changes the draft, before anything is sent', async () => {
    const { flow, activities } = await opened();
    const before = flow.preview.value.load;

    flow.draft.value.minutes = 30;
    const shorter = flow.preview.value.load;
    flow.draft.value.intensity = Intensity.Hard;

    expect(before).toBe(activityLoad(Intensity.Moderate, 90));
    expect(shorter).toBe(activityLoad(Intensity.Moderate, 30));
    expect(flow.preview.value.load).toBe(activityLoad(Intensity.Hard, 30));
    expect(activities).toEqual([]);
  });
});

describe('saving', () => {
  it("sends one Activity with an id made here and today's date, then closes the sheet", async () => {
    const { flow, activities } = await opened();
    flow.draft.value.minutes = 60;
    flow.draft.value.hot = true;

    await flow.save();

    expect(activities).toEqual([
      {
        id: expect.stringMatching(UUID),
        sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
        date: '2026-11-06',
        minutes: 60,
        intensity: Intensity.Moderate,
        hot: true,
      },
    ]);
    expect(flow.status.value).toBe(PlayedStatus.Saved);
    expect(flow.messageKey.value).toBe(PlayedMessageKey.Saved);
    expect(flow.savedLoad.value).toBe(activityLoad(Intensity.Moderate, 60));
    expect(flow.open.value).toBe(false);
  });

  it('sends the sport of their own by its name', async () => {
    const setup = setupPlayed();
    setup.setProfile(makeSavedProfile({ sport: { kind: SportKind.Other, name: 'Squash' } }));
    await opened(setup);

    await setup.flow.save();

    expect(setup.activities[0]?.sport).toEqual({ kind: SportKind.Other, name: 'Squash' });
  });

  it('sends once when saved twice quickly', async () => {
    const setup = await opened();
    let release = () => {};
    setup.state.gate = new Promise<void>((resolve) => (release = resolve));

    const first = setup.flow.save();
    const second = setup.flow.save();
    release();
    await Promise.all([first, second]);

    expect(setup.activities).toHaveLength(1);
  });

  it('asks for the week Load again afterwards', async () => {
    const setup = await opened();
    setup.state.week = makeWeekLoad({ load: 540 });

    await setup.flow.save();

    expect(setup.requests.at(-1)?.type).toBe(RequestType.GetWeekLoad);
  });

  it('reports an Activity saved on the phone when there is no signal', async () => {
    const setup = await opened();
    setup.state.logOutcome = QUEUED;

    await setup.flow.save();

    expect(setup.flow.status.value).toBe(PlayedStatus.Queued);
    expect(setup.flow.messageKey.value).toBe(PlayedMessageKey.Queued);
    expect(setup.flow.savedLoad.value).toBe(activityLoad(Intensity.Moderate, 90));
    expect(setup.flow.open.value).toBe(false);
  });

  it('keeps the sheet open with a message when the server refuses it', async () => {
    const setup = await opened();
    setup.state.logOutcome = REJECTED;

    await setup.flow.save();

    expect(setup.flow.status.value).toBe(PlayedStatus.Failed);
    expect(setup.flow.messageKey.value).toBe(PlayedMessageKey.DateOutOfRange);
    expect(setup.flow.open.value).toBe(true);
  });

  it('keeps the sheet open with a message when sending fails, and retries with the same id', async () => {
    const setup = await opened();
    setup.state.logOutcome = new AppError(AppErrorCode.Unknown);

    await setup.flow.save();
    setup.state.logOutcome = undefined;
    await setup.flow.save();

    expect(setup.activities).toHaveLength(2);
    expect(setup.activities[0]?.id).toBe(setup.activities[1]?.id);
    expect(setup.flow.status.value).toBe(PlayedStatus.Saved);
  });

  it('shows the failure while the sheet is open', async () => {
    const setup = await opened();
    setup.state.logOutcome = new AppError(AppErrorCode.Unknown);

    await setup.flow.save();

    expect(setup.flow.status.value).toBe(PlayedStatus.Failed);
    expect(setup.flow.messageKey.value).toBe(PlayedMessageKey.Failed);
    expect(setup.flow.open.value).toBe(true);
  });

  it('sends a signed-out person to sign in', async () => {
    const setup = await opened();
    setup.state.logOutcome = new AppError(AppErrorCode.Unauthorized);

    await setup.flow.save();

    expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });

  it('makes a new Activity for the next time the sheet is opened', async () => {
    const setup = await opened();
    await setup.flow.save();

    await setup.flow.openSheet();
    await setup.flow.save();

    expect(setup.activities).toHaveLength(2);
    expect(setup.activities[0]?.id).not.toBe(setup.activities[1]?.id);
  });
});
