import { AppError, AppErrorCode, RequestType } from '@stamina/app-core';
import {
  NutritionStatus,
  SaveNutritionSetupRejection,
  SaveNutritionSetupStatus,
} from '@stamina/contracts';
import { EnergySex, EverydayActivity, Goal } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { UnlockField } from '../enums/unlock-field.ts';
import { UnlockMessageKey } from '../enums/unlock-message-key.ts';
import { UnlockStatus } from '../enums/unlock-status.ts';
import { makeSavedProfile } from '../testing/make-saved-profile.ts';
import { setupUnlock } from '../testing/setup-unlock.ts';

function fillIn(setup: ReturnType<typeof setupUnlock>) {
  const { draft } = setup.flow;
  draft.value.sex = EnergySex.Male;
  draft.value.height = '180';
  draft.value.weight = '78';
  draft.value.everydayActivity = EverydayActivity.Sitting;
}

describe('useUnlockMeals', () => {
  describe('the body direction', () => {
    it('is asked when the Goal is about the body', async () => {
      const setup = setupUnlock();
      setup.setProfile(makeSavedProfile({ goal: Goal.BodyComposition }));

      await setup.flow.load();

      expect(setup.flow.askDirection.value).toBe(true);
    });

    it('is not asked for another Goal', async () => {
      const setup = setupUnlock();
      await setup.flow.load();

      expect(setup.flow.askDirection.value).toBe(false);
    });
  });

  describe('saving', () => {
    it('names what is missing and sends nothing', async () => {
      const setup = setupUnlock();

      await setup.flow.submit();

      expect(setup.flow.missing.value).toEqual([
        UnlockField.Sex,
        UnlockField.Height,
        UnlockField.Weight,
        UnlockField.EverydayActivity,
      ]);
      expect(setup.setups).toEqual([]);
    });

    it('sends the setup, then reads the day again for the persons own date', async () => {
      const setup = setupUnlock();
      fillIn(setup);

      await setup.flow.submit();

      expect(setup.setups).toHaveLength(1);
      expect(setup.setups[0]).toMatchObject({ sex: EnergySex.Male, heightCm: 180, weightKg: 78 });
      expect(setup.onSaved).toHaveBeenCalledTimes(1);
      expect(setup.dates).toEqual(['2026-11-07']);
      expect(setup.nutrition.nutrition.value?.status).toBe(NutritionStatus.Ready);
      expect(setup.flow.status.value).toBe(UnlockStatus.Idle);
    });

    it('counts a dislike that was typed but not added', async () => {
      const setup = setupUnlock();
      fillIn(setup);
      setup.flow.draft.value.dislikeText = ' liver ';

      await setup.flow.submit();

      expect(setup.setups[0]?.dislikes).toEqual(['liver']);
    });

    it('says so when nutrition is switched off', async () => {
      const setup = setupUnlock();
      setup.state.saveOutcome = {
        status: SaveNutritionSetupStatus.Rejected,
        reason: SaveNutritionSetupRejection.NutritionOff,
      };
      fillIn(setup);

      await setup.flow.submit();

      expect(setup.flow.messageKey.value).toBe(UnlockMessageKey.NutritionOff);
      expect(setup.flow.status.value).toBe(UnlockStatus.Failed);
      expect(setup.onSaved).not.toHaveBeenCalled();
    });

    it('says so when there is no signal', async () => {
      const setup = setupUnlock();
      setup.state.saveOutcome = new AppError(AppErrorCode.Offline);
      fillIn(setup);

      await setup.flow.submit();

      expect(setup.flow.messageKey.value).toBe(UnlockMessageKey.Offline);
    });

    it('sends a signed-out person to start', async () => {
      const setup = setupUnlock();
      setup.state.saveOutcome = new AppError(AppErrorCode.Unauthorized);
      fillIn(setup);

      await setup.flow.submit();

      expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
    });

    it('reads the profile only to know the Goal', async () => {
      const setup = setupUnlock();

      await setup.flow.load();

      expect(setup.requests.map((request) => request.type)).toEqual([RequestType.GetProfile]);
    });
  });
});
