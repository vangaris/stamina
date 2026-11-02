import { AppErrorCode, AppError } from '@stamina/app-core';
import { ApiError } from '@stamina/contracts';
import { ConsentPurpose } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { SafetyMessageKey } from '../enums/safety-message-key.ts';
import { SafetyPhase } from '../enums/safety-phase.ts';
import {
  grantBothConsents,
  screeningSubmission,
  setupSafety,
  type SetupSafetyOptions,
} from '../testing/setup-safety.ts';
import { useConsent } from './useConsent.ts';

async function setup(options: SetupSafetyOptions = {}, locale = Locale.En) {
  const { mediator, services } = await setupSafety(options);
  const onNavigate = vi.fn();
  const flow = useConsent({ onNavigate, mediator, locale: () => locale });
  return { flow, onNavigate, services };
}

const tickBoth = (flow: Awaited<ReturnType<typeof setup>>['flow']) => {
  flow.setAccepted(ConsentPurpose.Disclaimer, true);
  flow.setAccepted(ConsentPurpose.HealthData, true);
};

describe('useConsent', () => {
  it('shows the screen to someone who still has to consent, with both boxes unticked', async () => {
    const { flow, onNavigate } = await setup();

    await flow.load();

    expect(flow.phase.value).toBe(SafetyPhase.Ready);
    expect(flow.accepted.value).toEqual({
      [ConsentPurpose.Disclaimer]: false,
      [ConsentPurpose.HealthData]: false,
    });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('sends a signed-out person to the start', async () => {
    const { flow, onNavigate } = await setup({ signedIn: false });

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });

  it('sends someone without a saved profile to onboarding', async () => {
    const { flow, onNavigate } = await setup({ onboarded: false });

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Onboarding);
  });

  it('moves on to Screening for someone who already consented', async () => {
    const { flow, onNavigate, services } = await setup();
    await grantBothConsents(services);

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Screening);
  });

  it('moves on to Today for someone who is ready', async () => {
    const { flow, onNavigate, services } = await setup();
    await grantBothConsents(services);
    await services.api.saveScreening(screeningSubmission());

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Today);
  });

  it('names each box that is still unticked and sends nothing', async () => {
    const { flow, onNavigate, services } = await setup();
    await flow.load();
    flow.setAccepted(ConsentPurpose.Disclaimer, true);

    await flow.submit();

    expect(flow.errors.value).toEqual({ healthData: SafetyMessageKey.HealthDataRequired });
    expect(onNavigate).not.toHaveBeenCalled();
    expect((await services.api.getSafety()).granted).toEqual([]);
  });

  it('asks for both when neither is ticked, and clears a message when its box is ticked', async () => {
    const { flow } = await setup();
    await flow.load();

    await flow.submit();
    expect(flow.errors.value).toEqual({
      disclaimer: SafetyMessageKey.DisclaimerRequired,
      healthData: SafetyMessageKey.HealthDataRequired,
    });
    flow.setAccepted(ConsentPurpose.Disclaimer, true);

    expect(flow.errors.value.disclaimer).toBeUndefined();
    expect(flow.errors.value.healthData).toBe(SafetyMessageKey.HealthDataRequired);
  });

  it('records both consents in the language of the texts and goes to Screening', async () => {
    const { flow, onNavigate, services } = await setup({}, Locale.El);
    await flow.load();
    tickBoth(flow);

    await flow.submit();

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(RoutePath.Screening);
    const { consents } = await services.api.exportData();
    expect(consents).toMatchObject([
      { purpose: ConsentPurpose.Disclaimer, locale: Locale.El },
      { purpose: ConsentPurpose.HealthData, locale: Locale.El },
    ]);
  });

  it('explains being offline and keeps the boxes ticked', async () => {
    const { flow, onNavigate } = await setup({
      api: () => ({
        grantConsent: () => Promise.reject(new AppError(AppErrorCode.Offline)),
      }),
    });
    await flow.load();
    tickBoth(flow);

    await flow.submit();

    expect(flow.errorKey.value).toBe(SafetyMessageKey.ConsentOffline);
    expect(flow.accepted.value[ConsentPurpose.Disclaimer]).toBe(true);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('shows a generic message when the server fails, and goes to the start when the session ended', async () => {
    const failing = await setup({
      api: () => ({ grantConsent: () => Promise.reject(new ApiError(500)) }),
    });
    await failing.flow.load();
    tickBoth(failing.flow);
    await failing.flow.submit();
    expect(failing.flow.errorKey.value).toBe(SafetyMessageKey.ConsentUnknown);

    const expired = await setup({
      api: () => ({ grantConsent: () => Promise.reject(new ApiError(401)) }),
    });
    await expired.flow.load();
    tickBoth(expired.flow);
    await expired.flow.submit();
    expect(expired.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });

  it('shows a retry when the state cannot be loaded', async () => {
    const { flow } = await setup({
      api: () => ({ getSafety: () => Promise.reject(new ApiError(500)) }),
    });

    await flow.load();

    expect(flow.phase.value).toBe(SafetyPhase.Failed);
  });
});
