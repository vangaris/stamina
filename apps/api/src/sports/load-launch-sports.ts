import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launchSportDataSchema, type LaunchSportData } from '@stamina/contracts';
import { LaunchSport } from '@stamina/domain';
import { SPORT_DATA_DIR, SPORT_DATA_EXTENSION } from './config.ts';
import { SportDataError } from './sport-data-error.ts';

/**
 * Reads every `*.json` file of the data directory (in name order) into the launch sports, one per
 * `LaunchSport`. Fails loudly, with one error naming every file and field at fault, when a file is
 * not valid JSON or not a `launchSportDataSchema` entry, when an id appears in two files, or when
 * a launch sport has no file. Never returns a partial set. Node only: the Worker does not carry
 * the data.
 */
export async function loadLaunchSports(dir: string = SPORT_DATA_DIR): Promise<LaunchSportData[]> {
  const files = (await readdir(dir)).filter((file) => file.endsWith(SPORT_DATA_EXTENSION)).sort();
  const problems: string[] = [];
  const sports: { file: string; sport: LaunchSportData }[] = [];

  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(join(dir, file), 'utf-8'));
    } catch (error) {
      problems.push(`${file}: not readable JSON (${(error as Error).message})`);
      continue;
    }
    const parsed = launchSportDataSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push(`${file}: ${issue.path.map(String).join('.') || '(file)'} ${issue.message}`);
      }
      continue;
    }
    sports.push({ file, sport: parsed.data });
  }

  const fileOf = new Map<string, string>();
  for (const { file, sport } of sports) {
    const first = fileOf.get(sport.id);
    if (first !== undefined) {
      problems.push(`${file}: duplicate sport "${sport.id}" (first in ${first})`);
    } else {
      fileOf.set(sport.id, file);
    }
  }
  for (const id of Object.values(LaunchSport)) {
    if (!fileOf.has(id)) problems.push(`no data file for launch sport "${id}"`);
  }

  if (problems.length > 0) {
    throw new SportDataError(`Invalid sport data:\n${problems.join('\n')}`);
  }
  return sports.map(({ sport }) => sport);
}
