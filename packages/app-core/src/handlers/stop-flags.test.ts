import {
  ApiError,
  ProgramRejection,
  RecordStatus,
  ScreeningRejection,
  type ApiClient,
  type ReportStopFlag,
} from '@stamina/contracts';
import {
  BodyArea,
  ConsentPurpose,
  ScreeningQuestion,
  StopFlag,
  TrainingMode,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { newId } from '@stamina/ids';
import { describe, expect, it } from 'vitest';
import { QUEUED_RESULT } from '../config.ts';
import { createAppSync } from '../create-app-sync.ts';
import { createServices } from '../create-services.ts';
import { ServicesMode } from '../enums/services-mode.ts';
import {
  AppErrorCode,
  confirmDoctorSeen,
  createProgram,
  exportData,
  getSafety,
  grantConsent,
  recheckScreening,
  reportStopFlag,
  SafetyStatus,
} from '../index.ts';
import { readyToTrain } from '../testing/ready-to-train.ts';
import { signedUp } from '../testing/signed-up.ts';

const today = () => new Date().toISOString().slice(0, 10);

const flagOf = (flag: StopFlag, overrides: Partial<ReportStopFlag> = {}): ReportStopFlag => ({
  id: newId(),
  flag,
  date: today(),
  ...overrides,
});

/** A cleared person with Ready cached on the device, a switch for the network, a sync runner and a way to wrap the API. */
async function setup(wrapApi?: (api: ApiClient) => ApiClient) {
  const network = { online: true };
  const base = createServices({ mode: ServicesMode.Test });
  const ready = await readyToTrain(undefined, [], {
    api: wrapApi ? wrapApi(base.api) : base.api,
    auth: base.auth,
    network: { isOnline: () => network.online },
  });
  const sync = createAppSync({ services: ready.services, stores: ready.stores });
  expect((await ready.mediator.send(getSafety())).status).toBe(SafetyStatus.Ready);
  return { ...ready, network, sync, server: base.api };
}

describe('reporting a stop flag through the mediator', () => {
  it('writes the flag, sends it, pauses on a cardiac flag and keeps no local row', async () => {
    const { mediator, services, server } = await setup();
    const report = flagOf(StopFlag.ChestPain);

    const result = await mediator.send(reportStopFlag(report));

    expect(result).toMatchObject({
      status: RecordStatus.Saved,
      recorded: true,
      stop: { pausing: [StopFlag.ChestPain] },
    });
    expect(await services.stopFlags.list()).toEqual([]);
    expect(await services.offlineQueue.pending()).toEqual([]);
    expect((await server.getSafety()).stop.pausing).toEqual([StopFlag.ChestPain]);
    expect(await mediator.send(getSafety())).toMatchObject({
      status: SafetyStatus.Paused,
      stop: { pausing: [StopFlag.ChestPain] },
    });
  });

  it('rests a fever day without a pause and excludes the area of new pain', async () => {
    const { mediator } = await setup();

    await mediator.send(reportStopFlag(flagOf(StopFlag.Fever)));
    await mediator.send(reportStopFlag(flagOf(StopFlag.NewPain, { bodyArea: BodyArea.Knee })));

    expect(await mediator.send(getSafety())).toMatchObject({
      status: SafetyStatus.Ready,
      stop: { pausing: [], restOn: today(), excludedAreas: [BodyArea.Knee] },
    });
  });

  it('refuses a report with an area for any flag but new pain, or none for new pain, before anything is written', async () => {
    const { mediator, services } = await setup();

    await expect(
      mediator.send(reportStopFlag(flagOf(StopFlag.Fever, { bodyArea: BodyArea.Knee }))),
    ).rejects.toMatchObject({ code: AppErrorCode.ValidationFailed });
    await expect(mediator.send(reportStopFlag(flagOf(StopFlag.NewPain)))).rejects.toMatchObject({
      code: AppErrorCode.ValidationFailed,
    });

    expect(await services.stopFlags.list()).toEqual([]);
    expect(await services.offlineQueue.pending()).toEqual([]);
  });

  it('a replay of the same id is recognised by the server', async () => {
    const { mediator } = await setup();
    const report = flagOf(StopFlag.Heartbeat);

    await mediator.send(reportStopFlag(report));
    const again = await mediator.send(reportStopFlag(report));

    expect(again).toMatchObject({ status: RecordStatus.Saved, recorded: false });
  });

  describe('offline', () => {
    it('writes the flag on the device and queues it', async () => {
      const { mediator, network, services } = await setup();
      network.online = false;
      const report = flagOf(StopFlag.Fainting);

      expect(await mediator.send(reportStopFlag(report))).toBe(QUEUED_RESULT);

      expect((await services.stopFlags.list()).map((row) => row.report.id)).toEqual([report.id]);
      expect(await services.offlineQueue.pending()).toHaveLength(1);
    });

    it('pauses a cached Ready person at once after a cardiac flag', async () => {
      const { mediator, network } = await setup();
      network.online = false;

      await mediator.send(reportStopFlag(flagOf(StopFlag.ChestPain)));

      expect(await mediator.send(getSafety())).toMatchObject({
        status: SafetyStatus.Paused,
        stop: { pausing: [StopFlag.ChestPain] },
      });
    });

    it('stays Ready with a rest day after a fever flag', async () => {
      const { mediator, network } = await setup();
      network.online = false;

      await mediator.send(reportStopFlag(flagOf(StopFlag.Fever)));

      expect(await mediator.send(getSafety())).toMatchObject({
        status: SafetyStatus.Ready,
        stop: { pausing: [], restOn: today() },
      });
    });

    it('keeps a pause learned online in force offline', async () => {
      const { mediator, network } = await setup();
      await mediator.send(reportStopFlag(flagOf(StopFlag.HeadKnock)));
      await mediator.send(getSafety());
      network.online = false;

      expect(await mediator.send(getSafety())).toMatchObject({
        status: SafetyStatus.Paused,
        stop: { pausing: [StopFlag.HeadKnock] },
      });
    });

    it('keeps the pause when the flag was reported online and the person then goes offline', async () => {
      const { mediator, network } = await setup();
      await mediator.send(reportStopFlag(flagOf(StopFlag.Breathlessness)));
      network.online = false;

      expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Paused });
    });

    it('replays on reconnect once and clears the local row', async () => {
      let calls = 0;
      const { mediator, network, services, sync, server } = await setup((api) => ({
        ...api,
        reportStopFlag: (report) => {
          calls += 1;
          return api.reportStopFlag(report);
        },
      }));
      network.online = false;
      await mediator.send(reportStopFlag(flagOf(StopFlag.ChestPain)));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
      expect(await sync()).toEqual({ replayed: 0, remaining: 0 });

      expect(calls).toBe(1);
      expect(await services.stopFlags.list()).toEqual([]);
      expect((await server.getSafety()).stop.pausing).toEqual([StopFlag.ChestPain]);
      expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Paused });
    });

    it('queues the flag when the send cannot reach the server, keeping the pause', async () => {
      let failing = true;
      const { mediator, services, sync } = await setup((api) => ({
        ...api,
        reportStopFlag: async (report) => {
          if (failing) throw new TypeError('Failed to fetch');
          return api.reportStopFlag(report);
        },
      }));

      expect(await mediator.send(reportStopFlag(flagOf(StopFlag.ChestPain)))).toBe(QUEUED_RESULT);
      expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Paused });

      failing = false;
      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
      expect(await services.stopFlags.list()).toEqual([]);
    });
  });

  describe('a permanent client error', () => {
    it.each([400, 404, 422])(
      'on an online send (%i) takes the flag off the device and queues nothing',
      async (status) => {
        const { mediator, services } = await setup((api) => ({
          ...api,
          reportStopFlag: async () => {
            throw new ApiError(status);
          },
        }));

        await expect(
          mediator.send(reportStopFlag(flagOf(StopFlag.ChestPain))),
        ).rejects.toBeDefined();

        expect(await services.stopFlags.list()).toEqual([]);
        expect(await services.offlineQueue.pending()).toEqual([]);
        expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Ready });
      },
    );

    it('on a replay drops the queued flag and its local row', async () => {
      const { mediator, network, services, sync } = await setup((api) => ({
        ...api,
        reportStopFlag: async () => {
          throw new ApiError(422);
        },
      }));
      network.online = false;
      await mediator.send(reportStopFlag(flagOf(StopFlag.ChestPain)));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });

      expect(await services.stopFlags.list()).toEqual([]);
      expect(await services.offlineQueue.pending()).toEqual([]);
    });
  });
});

describe('confirming a doctor has seen the person', () => {
  it('ends the pause, keeps the rest day and the excluded area, and keeps Ready offline', async () => {
    const { mediator, network, services } = await setup();
    await mediator.send(reportStopFlag(flagOf(StopFlag.ChestPain)));
    await mediator.send(reportStopFlag(flagOf(StopFlag.Fever)));
    await mediator.send(reportStopFlag(flagOf(StopFlag.NewPain, { bodyArea: BodyArea.Hip })));
    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Paused });

    const result = await mediator.send(confirmDoctorSeen([StopFlag.ChestPain]));

    expect(result).toMatchObject({
      status: RecordStatus.Saved,
      stop: { pausing: [], restOn: today(), excludedAreas: [BodyArea.Hip] },
    });
    expect(await services.stopFlags.list()).toEqual([]);
    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Ready });
    network.online = false;
    expect(await mediator.send(getSafety())).toMatchObject({
      status: SafetyStatus.Ready,
      stop: { pausing: [] },
    });
  });

  it('changes nothing when no pause is open', async () => {
    const { mediator } = await setup();

    expect(await mediator.send(confirmDoctorSeen([StopFlag.ChestPain]))).toMatchObject({
      status: RecordStatus.Saved,
      stop: { pausing: [], restOn: null, excludedAreas: [] },
    });
  });

  it('ends only the kinds confirmed: another paused kind stays paused', async () => {
    const { mediator } = await setup();
    await mediator.send(reportStopFlag(flagOf(StopFlag.ChestPain)));
    await mediator.send(reportStopFlag(flagOf(StopFlag.Fainting)));

    const result = await mediator.send(confirmDoctorSeen([StopFlag.ChestPain]));

    expect(result.stop.pausing).toEqual([StopFlag.Fainting]);
    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Paused });
  });

  it('rejects Offline without signal: it needs the server', async () => {
    const { mediator, network } = await setup();
    network.online = false;

    await expect(mediator.send(confirmDoctorSeen([StopFlag.ChestPain]))).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });
  });

  it('rejects UnsyncedData while a flag is still queued, then ends the pause once it is sent', async () => {
    let failing = true;
    const { mediator, services } = await setup((api) => ({
      ...api,
      reportStopFlag: async (report) => {
        if (failing) throw new TypeError('Failed to fetch');
        return api.reportStopFlag(report);
      },
    }));
    await mediator.send(reportStopFlag(flagOf(StopFlag.ChestPain)));
    expect(await services.offlineQueue.pending()).toHaveLength(1);

    await expect(mediator.send(confirmDoctorSeen([StopFlag.ChestPain]))).rejects.toMatchObject({
      code: AppErrorCode.UnsyncedData,
    });
    expect(await services.stopFlags.list()).toHaveLength(1);
    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Paused });

    failing = false;
    const result = await mediator.send(confirmDoctorSeen([StopFlag.ChestPain]));

    expect(result.stop.pausing).toEqual([]);
    expect(await services.stopFlags.list()).toEqual([]);
    expect(await services.offlineQueue.pending()).toEqual([]);
    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Ready });
  });
});

describe('what a pause does to the Program', () => {
  it('refuses the Program while paused and creates it once confirmed', async () => {
    const { mediator } = await setup();
    await mediator.send(reportStopFlag(flagOf(StopFlag.Fainting)));

    expect(await mediator.send(createProgram())).toEqual({
      status: RecordStatus.Rejected,
      reason: ProgramRejection.Paused,
    });

    await mediator.send(confirmDoctorSeen([StopFlag.Fainting]));

    expect(await mediator.send(createProgram())).toMatchObject({ status: RecordStatus.Saved });
  });

  it('still creates the Program on a fever day or with an excluded area', async () => {
    const { mediator } = await setup();
    await mediator.send(reportStopFlag(flagOf(StopFlag.Fever)));
    await mediator.send(reportStopFlag(flagOf(StopFlag.NewPain, { bodyArea: BodyArea.Knee })));

    expect(await mediator.send(createProgram())).toMatchObject({ status: RecordStatus.Saved });
  });
});

describe('asking the Screening questions again', () => {
  it('passes a referral through and Referred is what the safety state reads', async () => {
    const { mediator } = await setup();
    await mediator.send(reportStopFlag(flagOf(StopFlag.Heartbeat)));

    const result = await mediator.send(
      recheckScreening({ answers: { [ScreeningQuestion.HeartCondition]: true } }),
    );

    expect(result).toMatchObject({
      status: RecordStatus.Saved,
      screening: { trainingMode: TrainingMode.Referred },
    });
    expect(await mediator.send(getSafety())).toMatchObject({
      status: SafetyStatus.Referred,
      stop: { pausing: [StopFlag.Heartbeat] },
    });
  });

  it('carries the other answers over: all no leaves the person cleared', async () => {
    const { mediator } = await setup();

    const result = await mediator.send(
      recheckScreening({ answers: { [ScreeningQuestion.Fainting]: false } }),
    );

    expect(result).toMatchObject({ status: RecordStatus.Saved });
    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Ready });
  });

  it('answers the new-pain question with its body areas', async () => {
    const { mediator } = await setup();

    const result = await mediator.send(
      recheckScreening({
        answers: { [ScreeningQuestion.BoneJointMuscle]: true },
        bodyAreas: [BodyArea.Knee],
      }),
    );

    expect(result).toMatchObject({
      status: RecordStatus.Saved,
      screening: { excludedAreas: [BodyArea.Knee] },
    });
  });

  it('refuses an empty or inconsistent re-ask before anything is sent', async () => {
    const { mediator } = await setup();

    await expect(mediator.send(recheckScreening({ answers: {} }))).rejects.toMatchObject({
      code: AppErrorCode.ValidationFailed,
    });
    await expect(
      mediator.send(
        recheckScreening({
          answers: { [ScreeningQuestion.Fainting]: false },
          bodyAreas: [BodyArea.Hip],
        }),
      ),
    ).rejects.toMatchObject({ code: AppErrorCode.ValidationFailed });
  });

  it('rejects Offline without signal: it needs the server', async () => {
    const { mediator, network } = await setup();
    network.online = false;

    await expect(
      mediator.send(recheckScreening({ answers: { [ScreeningQuestion.Fainting]: false } })),
    ).rejects.toMatchObject({ code: AppErrorCode.Offline });
  });

  it('is a Rejected result before the consents are given', async () => {
    const { mediator } = await signedUp();

    expect(
      await mediator.send(recheckScreening({ answers: { [ScreeningQuestion.Fainting]: false } })),
    ).toEqual({ status: RecordStatus.Rejected, reason: ScreeningRejection.ConsentMissing });
  });

  it('answers NoScreening for a person with consents but no Screening', async () => {
    const { mediator } = await signedUp();
    for (const purpose of Object.values(ConsentPurpose)) {
      await mediator.send(grantConsent({ purpose, locale: Locale.En }));
    }

    expect(
      await mediator.send(recheckScreening({ answers: { [ScreeningQuestion.Fainting]: false } })),
    ).toEqual({ status: RecordStatus.Rejected, reason: ScreeningRejection.NoScreening });
  });
});

describe('the data export', () => {
  it('lists the stop flags reported, oldest first, with when they were confirmed', async () => {
    const { mediator } = await setup();
    const first = flagOf(StopFlag.ChestPain);
    const second = flagOf(StopFlag.NewPain, { bodyArea: BodyArea.Knee });
    await mediator.send(reportStopFlag(first));
    await mediator.send(confirmDoctorSeen([StopFlag.ChestPain]));
    await mediator.send(reportStopFlag(second));

    const { stopFlags } = await mediator.send(exportData());

    expect(stopFlags.map(({ id }) => id)).toEqual([first.id, second.id]);
    expect(stopFlags[0]?.confirmedAt).not.toBeNull();
    expect(stopFlags[1]).toMatchObject({ area: BodyArea.Knee, confirmedAt: null });
  });
});
