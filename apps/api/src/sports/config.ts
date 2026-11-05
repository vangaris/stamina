import { fileURLToPath } from 'node:url';

/** Where the launch sports live: one JSON file (a `launchSportDataSchema` entry) per `LaunchSport`. */
export const SPORT_DATA_DIR = fileURLToPath(new URL('./data', import.meta.url));

export const SPORT_DATA_EXTENSION = '.json';

/** Prefix of the temporary normalized name a stray sport row takes while a launch sport is seeded. */
export const STRAY_NAME_PREFIX = 'stray:';

/** `sports:draft` flag that replaces a profile the draft already has. */
export const DRAFT_OVERWRITE_FLAG = '--overwrite';
