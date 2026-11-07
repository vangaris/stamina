import { AppError, AppErrorCode, RequestType, logWeighIn } from '@stamina/app-core';
import { VerdictKind } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { ProgressMessageKey } from '../enums/progress-message-key.ts';
import { ProgressStatus } from '../enums/progress-status.ts';
import { WeighInMessageKey } from '../enums/weigh-in-message-key.ts';
import { WeighInStatus } from '../enums/weigh-in-status.ts';
import { SERVER_TODAY } from '../testing/create-mock-mediator.ts';
import { makeProgress } from '../testing/make-progress.ts';
import { setupProgress } from '../testing/setup-progress.ts';

describe('useProgress', () => {
  describe('loading', () => {
    it('reads the numbers once and words them', async () => {
      const setup = setupProgress();

      await setup.flow.load();

      expect(setup.flow.status.value).toBe(ProgressStatus.Ready);
      expect(setup.requests.map((request) => request.type)).toEqual([RequestType.GetProgress]);
      expect(setup.flow.progress.value?.sessions).toEqual({ done: 1, planned: 3 });
      expect(setup.flow.weeks.value).toEqual([
        { label: 'Oct 13', done: 1500, planned: 0, current: false },
        { label: 'Oct 20', done: 1700, planned: 0, current: false },
        { label: 'Oct 27', done: 1600, planned: 0, current: false },
        { label: 'Nov 3', done: 900, planned: 800, current: true },
      ]);
      expect(setup.flow.verdict.value).toEqual({
        key: 'progress.verdict.on-track',
        params: { average: '1,600', sessionsDone: 1, sessionsPlanned: 3 },
      });
    });

    it("words the server's verdict whatever kind it is", async () => {
      const setup = setupProgress();
      const { verdict } = makeProgress();
      setup.state.progress = makeProgress({
        verdict: { ...verdict, kind: VerdictKind.SessionsBehind },
      });

      await setup.flow.load();

      expect(setup.flow.verdict.value?.key).toBe('progress.verdict.sessions-behind');
    });

    it('shows nothing to draw before it has the numbers', () => {
      const setup = setupProgress();

      expect(setup.flow.status.value).toBe(ProgressStatus.Loading);
      expect(setup.flow.weeks.value).toEqual([]);
      expect(setup.flow.verdict.value).toBeUndefined();
    });

    it('says there is no signal when it was never fetched', async () => {
      const setup = setupProgress();
      setup.state.progressError = new AppError(AppErrorCode.Offline);

      await setup.flow.load();

      expect(setup.flow.status.value).toBe(ProgressStatus.Failed);
      expect(setup.flow.messageKey.value).toBe(ProgressMessageKey.Offline);
    });

    it('falls back to the generic message for any other failure, and recovers on retry', async () => {
      const setup = setupProgress();
      setup.state.progressError = new AppError(AppErrorCode.Unknown);
      await setup.flow.load();
      expect(setup.flow.messageKey.value).toBe(ProgressMessageKey.Failed);

      setup.state.progressError = undefined;
      await setup.flow.load();

      expect(setup.flow.status.value).toBe(ProgressStatus.Ready);
      expect(setup.flow.messageKey.value).toBeUndefined();
    });

    it('sends a signed-out person back to the start', async () => {
      const setup = setupProgress();
      setup.state.progressError = new AppError(AppErrorCode.Unauthorized);

      await setup.flow.load();

      expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
    });
  });

  describe('the weigh-in', () => {
    async function loaded() {
      const setup = setupProgress();
      await setup.flow.load();
      return setup;
    }

    it('sends the weight in kilograms and then shows what the server stored as the latest, no longer due', async () => {
      const setup = await loaded();
      setup.flow.weight.value = '72,5';

      await setup.flow.submitWeighIn();

      expect(setup.requests.at(-1)).toEqual(logWeighIn({ weightKg: 72.5, date: SERVER_TODAY }));
      expect(setup.flow.weighInStatus.value).toBe(WeighInStatus.Saved);
      expect(setup.flow.weighInMessageKey.value).toBe(WeighInMessageKey.Saved);
      expect(setup.flow.progress.value?.weighIn).toEqual({
        latest: { date: SERVER_TODAY, weightKg: 72.5 },
        due: false,
      });
      expect(setup.flow.weight.value).toBe('');
    });

    it('sends nothing for a weight outside 30 to 300 kg or not a number', async () => {
      const setup = await loaded();

      for (const text of ['', 'heavy', '29', '301']) {
        setup.flow.weight.value = text;
        await setup.flow.submitWeighIn();
        expect(setup.flow.weighInStatus.value).toBe(WeighInStatus.Failed);
        expect(setup.flow.weighInMessageKey.value).toBe(WeighInMessageKey.Invalid);
      }
      expect(setup.weighIns).toEqual([]);
    });

    it('keeps the weight typed and says a weigh-in needs a connection when there is none', async () => {
      const setup = await loaded();
      setup.state.weighInError = new AppError(AppErrorCode.Offline);
      setup.flow.weight.value = '70';

      await setup.flow.submitWeighIn();

      expect(setup.flow.weighInStatus.value).toBe(WeighInStatus.Failed);
      expect(setup.flow.weighInMessageKey.value).toBe(WeighInMessageKey.Offline);
      expect(setup.flow.weight.value).toBe('70');
      expect(setup.flow.progress.value?.weighIn.latest).toBeNull();
    });

    it('falls back to the generic message for any other failure', async () => {
      const setup = await loaded();
      setup.state.weighInError = new AppError(AppErrorCode.Unknown);
      setup.flow.weight.value = '70';

      await setup.flow.submitWeighIn();

      expect(setup.flow.weighInMessageKey.value).toBe(WeighInMessageKey.Failed);
    });

    it('sends a signed-out person back to the start', async () => {
      const setup = await loaded();
      setup.state.weighInError = new AppError(AppErrorCode.Unauthorized);
      setup.flow.weight.value = '70';

      await setup.flow.submitWeighIn();

      expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
    });

    it('ignores a second tap while the first is being sent', async () => {
      const setup = await loaded();
      let release!: () => void;
      setup.state.gate = new Promise<void>((resolve) => (release = resolve));
      setup.flow.weight.value = '70';

      const first = setup.flow.submitWeighIn();
      await setup.flow.submitWeighIn();
      release();
      await first;

      expect(setup.weighIns).toHaveLength(1);
    });
  });
});
