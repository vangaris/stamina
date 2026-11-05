import { type LaunchSportData } from '@stamina/contracts';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLaunchSports, SPORT_DATA_DIR } from '../src/sports/node.ts';

/** Wording a source title must never carry: the copy rule allows no injury-prevention or medical claim. */
const FORBIDDEN_TITLE_WORDS = [
  'prevent',
  'injur',
  'rehab',
  'therapy',
  'protect',
  'heal',
  'treat',
  'medical',
];

/**
 * The real launch sport files (`apps/api/src/sports/data/*.json`), as the research drafted them.
 * `loadLaunchSports` already fails the suite when a file is missing or breaks the schema (energy
 * mix, METs, https sources, one file per launch sport); these cases cover what the schema cannot.
 * See `docs/sport-profile-review.md` for how a finding is fixed. This is not Vang's review: it
 * only catches what a machine can.
 */
describe('real sport data', () => {
  let sports: LaunchSportData[];
  beforeAll(async () => {
    sports = await loadLaunchSports(SPORT_DATA_DIR);
  });

  it('cites no url twice within a sport', () => {
    for (const { id, sources } of sports) {
      expect(new Set(sources.map((s) => s.url)).size, `${id} repeats a url`).toBe(sources.length);
    }
  });

  it('carries no injury-prevention or medical wording in a source title', () => {
    for (const { id, sources } of sports) {
      for (const { title } of sources) {
        for (const word of FORBIDDEN_TITLE_WORDS) {
          expect(title.toLowerCase().includes(word), `${id}: "${title}" contains "${word}"`).toBe(
            false,
          );
        }
      }
    }
  });

  it('has no two sports with the same profile', () => {
    const seen = new Map<string, string>();
    for (const { id, profile } of sports) {
      const key = JSON.stringify(profile);
      expect(seen.get(key), `${id} has the same profile as ${seen.get(key)}`).toBeUndefined();
      seen.set(key, id);
    }
  });
});
