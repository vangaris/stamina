import { ApiError, RecordStatus, DoctorOkRejection } from '@stamina/contracts';
import { ScreeningQuestion, TrainingMode } from '@stamina/domain';
import { describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { EXPORT_FILE_NAME } from '../config.ts';
import { ReferredView } from '../enums/referred-view.ts';
import { SafetyMessageKey } from '../enums/safety-message-key.ts';
import { SafetyPhase } from '../enums/safety-phase.ts';
import {
  grantBothConsents,
  screeningSubmission,
  setupSafety,
  type SetupSafetyOptions,
} from '../testing/setup-safety.ts';
import { useReferred } from './useReferred.ts';

async function setup(
  yes: ScreeningQuestion[] | null = [ScreeningQuestion.HeartCondition],
  options: SetupSafetyOptions = {},
) {
  const { mediator, services } = await setupSafety(options);
  if (options.signedIn !== false) {
    await grantBothConsents(services);
    if (yes) await services.api.saveScreening(screeningSubmission(yes));
  }
  const onNavigate = vi.fn();
  const save = vi.fn();
  const flow = useReferred({ onNavigate, mediator, save });
  return { flow, onNavigate, save, services };
}

describe('useReferred: arriving', () => {
  it('shows the general referral', async () => {
    const { flow, onNavigate } = await setup();

    await flow.load();

    expect(flow.phase.value).toBe(SafetyPhase.Ready);
    expect(flow.view.value).toBe(ReferredView.Referral);
    expect(flow.isPregnancy.value).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('uses the pregnancy wording after a pregnancy referral', async () => {
    const { flow } = await setup([ScreeningQuestion.Pregnancy]);

    await flow.load();

    expect(flow.isPregnancy.value).toBe(true);
  });

  it('sends a cleared person on to Today and someone without a Screening to Screening', async () => {
    const cleared = await setup([]);
    await cleared.flow.load();
    expect(cleared.onNavigate).toHaveBeenCalledWith(RoutePath.Today);

    const none = await setup(null);
    await none.flow.load();
    expect(none.onNavigate).toHaveBeenCalledWith(RoutePath.Screening);
  });

  it('sends a signed-out person to the start', async () => {
    const { flow, onNavigate } = await setup(null, { signedIn: false });

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });
});

describe('useReferred: export and delete', () => {
  it('hands the person their data, answers included, as a file', async () => {
    const { flow, save } = await setup();
    await flow.load();

    await flow.exportMyData();

    expect(save).toHaveBeenCalledExactlyOnceWith(
      EXPORT_FILE_NAME,
      expect.objectContaining({
        screenings: [
          expect.objectContaining({
            answers: expect.objectContaining({ [ScreeningQuestion.HeartCondition]: true }),
          }),
        ],
      }),
    );
    expect(flow.exported.value).toBe(true);
  });

  it('asks before deleting, and keeping the data goes back to the referral', async () => {
    const { flow, services } = await setup();
    await flow.load();

    flow.askToDelete();
    expect(flow.view.value).toBe(ReferredView.ConfirmDelete);
    flow.keepData();

    expect(flow.view.value).toBe(ReferredView.Referral);
    expect((await services.api.exportData()).screenings).toHaveLength(1);
  });

  it('deletes everything, signs out and goes to the start', async () => {
    const { flow, onNavigate, services } = await setup();
    await flow.load();
    flow.askToDelete();

    await flow.confirmDelete();

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(RoutePath.Start);
    expect(await services.auth.getSession()).toBeUndefined();
  });

  it('stays on the confirmation with a message when deleting fails', async () => {
    const { flow, onNavigate } = await setup([ScreeningQuestion.HeartCondition], {
      api: () => ({ deleteAccount: () => Promise.reject(new ApiError(500)) }),
    });
    await flow.load();
    flow.askToDelete();

    await flow.confirmDelete();

    expect(flow.view.value).toBe(ReferredView.ConfirmDelete);
    expect(flow.errorKey.value).toBe(SafetyMessageKey.ReferredUnknown);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(flow.busy.value).toBe(false);
  });

  it('signs out from the referral', async () => {
    const { flow, onNavigate, services } = await setup();
    await flow.load();

    await flow.signOut();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Start);
    expect(await services.auth.getSession()).toBeUndefined();
  });
});

describe('useReferred: "a doctor has said I can train"', () => {
  it('records the statement, sets Limited mode and then goes on to the reveal', async () => {
    const { flow, onNavigate, services } = await setup();
    await flow.load();

    await flow.stateDoctorOk();

    expect(flow.view.value).toBe(ReferredView.Limited);
    expect((await services.api.getSafety()).screening?.trainingMode).toBe(TrainingMode.Limited);
    await flow.continueOn();
    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Reveal);
  });

  it('shows where the person belongs when the server turns the statement down', async () => {
    const { flow, onNavigate } = await setup([ScreeningQuestion.Pregnancy], {
      api: (base) => ({
        recordDoctorOk: async () => {
          await base.recordDoctorOk();
          return { status: RecordStatus.Rejected, reason: DoctorOkRejection.Pregnancy };
        },
      }),
    });
    await flow.load();

    await flow.stateDoctorOk();

    expect(flow.view.value).toBe(ReferredView.Referral);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
