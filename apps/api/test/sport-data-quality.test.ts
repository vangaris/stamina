import { type LaunchSportData } from '@stamina/contracts';
import { ENERGY_MIX_TOTAL, LaunchSport } from '@stamina/domain';
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
 * Fails until all 11 exist and meet the bar; see `docs/sport-profile-review.md` for how a finding
 * is fixed. This is not Vang's review: it only catches what a machine can.
 */
describe('real sport data', () => {
  let sports: LaunchSportData[];
  beforeAll(async () => {
    sports = await loadLaunchSports(SPORT_DATA_DIR);
  });

  it('has exactly one valid file per launch sport', () => {
    expect(sports.map((s) => s.id).sort()).toEqual(Object.values(LaunchSport).sort());
  });

  it('adds every energy mix up to 100 and names at least one high-load area', () => {
    for (const { id, profile } of sports) {
      const { aerobic, repeatedSprint, explosive } = profile.energyMix;
      expect(aerobic + repeatedSprint + explosive, id).toBe(ENERGY_MIX_TOTAL);
      expect(profile.highLoadAreas.length, id).toBeGreaterThanOrEqual(1);
    }
  });

  it('does not let METs fall as effort rises', () => {
    for (const { id, profile } of sports) {
      const { easy, moderate, hard } = profile.metsPerIntensity;
      expect(hard, id).toBeGreaterThanOrEqual(moderate);
      expect(moderate, id).toBeGreaterThanOrEqual(easy);
    }
  });

  it('cites https sources, none repeated within a sport', () => {
    for (const { id, sources } of sports) {
      for (const source of sources)
        expect(source.url.startsWith('https://'), `${id} ${source.url}`).toBe(true);
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
