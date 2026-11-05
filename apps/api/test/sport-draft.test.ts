import { sportDraftSchema, type LaunchSportData } from '@stamina/contracts';
import { LaunchSport, SportStatus } from '@stamina/domain';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiPurpose } from '../src/ai/enums/ai-purpose.ts';
import { AiUnavailableError, unavailableAiProvider } from '../src/ai/provider.ts';
import { createPgDb } from '../src/db/pg-client.ts';
import { sport } from '../src/db/schema.ts';
import type { DbHandle } from '../src/db/types.ts';
import { loadLaunchSports, SportDraftError, draftSportProfile } from '../src/sports/node.ts';
import { createFakeAi } from './support/fake-ai.ts';
import { FIXTURE_LIBRARY_DIR } from './support/exercise-library-dir.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { FIXTURE_SPORT_DIR } from './support/sport-data-dir.ts';
import { requestSport } from '../src/sports/index.ts';
import { withUser } from '../src/db/with-user.ts';
import { appUser } from '../src/db/schema.ts';

const run = promisify(execFile);

describe('drafting a sport profile', () => {
  let scratch: ScratchDatabase;
  let handle: DbHandle;
  let launch: LaunchSportData[];
  const draft = () => ({
    profile: launch[0]!.profile,
    sources: launch[0]!.sources,
  });

  beforeAll(async () => {
    launch = await loadLaunchSports(FIXTURE_SPORT_DIR);
    scratch = await createScratchDatabase(FIXTURE_LIBRARY_DIR);
    handle = createPgDb(scratch.url);
  });
  afterAll(async () => {
    await handle.close();
    await scratch.drop();
  });

  /** A requested sport with no profile yet, as save-profile creates it. */
  const undrafted = async (name: string) => {
    // A new person each time: one person may hold only a few unapproved requests.
    const asker = crypto.randomUUID();
    await handle.db.insert(appUser).values({ id: asker });
    return (await withUser(handle.db, asker, (tx) => requestSport(tx, name)))!;
  };
  const row = async (id: string) =>
    (await handle.db.select().from(sport).where(eq(sport.id, id)))[0]!;

  it('stores the profile and sources on the draft, leaving status, version and approval alone', async () => {
    const id = await undrafted('Beach Tennis');
    const ai = createFakeAi();
    ai.queue(draft());

    await draftSportProfile(handle.db, ai.provider, id);

    expect(await row(id)).toMatchObject({
      status: SportStatus.Draft,
      version: 1,
      approvedBy: null,
      approvedAt: null,
      profile: draft().profile,
      sources: draft().sources,
    });
  });

  it('asks from the sport name only, for the schema, with the copy rule stated', async () => {
    const id = await undrafted('Roller Hockey');
    const ai = createFakeAi();
    ai.queue(draft());

    await draftSportProfile(handle.db, ai.provider, id);

    expect(ai.calls).toHaveLength(1);
    const [call] = ai.calls;
    expect(call?.purpose).toBe(AiPurpose.SportDraft);
    expect(call?.schema).toBe(sportDraftSchema);
    expect(call?.prompt).toContain('"Roller Hockey"');
    expect(call?.prompt).toContain('https URL');
    expect(call?.prompt).toMatch(/no injury-prevention/i);
  });

  it('refuses a draft that already has a profile, leaving it as it was, unless overwrite is passed', async () => {
    const before = (await row(LaunchSport.Running)).profile;
    const ai = createFakeAi();
    ai.queue(draft());

    await expect(draftSportProfile(handle.db, ai.provider, LaunchSport.Running)).rejects.toThrow(
      SportDraftError,
    );
    expect(ai.calls).toEqual([]);
    expect((await row(LaunchSport.Running)).profile).toEqual(before);

    await draftSportProfile(handle.db, ai.provider, LaunchSport.Running, { overwrite: true });
    expect((await row(LaunchSport.Running)).profile).toEqual(draft().profile);
  });

  it('does not overwrite a profile written by hand while the model was answering', async () => {
    const id = await undrafted('Hand Edited Sport');
    const handWritten = launch[3]!;
    const racing = {
      async generateObject<T>() {
        await handle.db
          .update(sport)
          .set({ profile: handWritten.profile, sources: handWritten.sources })
          .where(eq(sport.id, id));
        return draft() as T;
      },
    };

    await expect(draftSportProfile(handle.db, racing, id)).rejects.toBeInstanceOf(SportDraftError);
    expect((await row(id)).profile).toEqual(handWritten.profile);
  });

  it('refuses an approved sport and leaves it as it was', async () => {
    const id = await undrafted('Approved Sport');
    await handle.db
      .update(sport)
      .set({
        status: SportStatus.Approved,
        profile: launch[1]!.profile,
        sources: launch[1]!.sources,
        approvedBy: 'Vang',
        approvedAt: new Date(),
      })
      .where(eq(sport.id, id));
    const ai = createFakeAi();
    ai.queue(draft());

    await expect(draftSportProfile(handle.db, ai.provider, id)).rejects.toBeInstanceOf(
      SportDraftError,
    );

    expect(ai.calls).toEqual([]);
    expect((await row(id)).profile).toEqual(launch[1]!.profile);
  });

  it('refuses a rejected sport and an unknown one', async () => {
    const id = await undrafted('Rejected Sport');
    await handle.db.update(sport).set({ status: SportStatus.Rejected }).where(eq(sport.id, id));
    const ai = createFakeAi();
    await expect(draftSportProfile(handle.db, ai.provider, id)).rejects.toBeInstanceOf(
      SportDraftError,
    );
    await expect(draftSportProfile(handle.db, ai.provider, 'no-such-sport')).rejects.toBeInstanceOf(
      SportDraftError,
    );
    expect(ai.calls).toEqual([]);
  });

  it('rejects an invalid model output and stores nothing', async () => {
    const id = await undrafted('Invalid Output Sport');
    const ai = createFakeAi();
    ai.queue({
      profile: {
        ...draft().profile,
        energyMix: { aerobic: 90, repeatedSprint: 90, explosive: 90 },
      },
      sources: draft().sources,
    });

    await expect(draftSportProfile(handle.db, ai.provider, id)).rejects.toThrow();

    expect(await row(id)).toMatchObject({ profile: null, sources: null });
  });

  it('surfaces an unavailable provider and stores nothing', async () => {
    const id = await undrafted('Unavailable Sport');
    await expect(draftSportProfile(handle.db, unavailableAiProvider, id)).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
    expect(await row(id)).toMatchObject({ profile: null, sources: null });
  });

  it('does not overwrite a sport that was approved while the model was answering', async () => {
    const id = await undrafted('Race Sport');
    const approvedProfile = launch[2]!;
    const racing = {
      async generateObject<T>() {
        await handle.db
          .update(sport)
          .set({
            status: SportStatus.Approved,
            profile: approvedProfile.profile,
            sources: approvedProfile.sources,
            approvedBy: 'Vang',
            approvedAt: new Date(),
          })
          .where(eq(sport.id, id));
        return draft() as T;
      },
    };

    await expect(draftSportProfile(handle.db, racing, id)).rejects.toBeInstanceOf(SportDraftError);
    expect((await row(id)).profile).toEqual(approvedProfile.profile);
  });

  it('exits non-zero from the sports:draft script, saying no AI provider is configured yet', async () => {
    const error = await run(
      'pnpm',
      ['exec', 'tsx', 'scripts/draft-sport.ts', LaunchSport.Padel, '--overwrite'],
      { env: { ...process.env, DATABASE_URL: scratch.url } },
    ).then(
      () => undefined,
      (e: unknown) => e as { code: number; stderr: string },
    );
    expect(error?.code).toBe(1);
    expect(error?.stderr).toContain('No AI provider is configured yet');
    expect((await row(LaunchSport.Padel)).status).toBe(SportStatus.Draft);
  }, 30_000);

  it('refuses a drafted sport from the script without --overwrite', async () => {
    const error = await run('pnpm', ['exec', 'tsx', 'scripts/draft-sport.ts', LaunchSport.Padel], {
      env: { ...process.env, DATABASE_URL: scratch.url },
    }).then(
      () => undefined,
      (e: unknown) => e as { code: number; stderr: string },
    );
    expect(error?.code).toBe(1);
    expect(error?.stderr).toContain('already has a profile');
  }, 30_000);
});
