import { fileURLToPath } from 'node:url';

/** Where the launch sports live: one JSON file (a `launchSportDataSchema` entry) per `LaunchSport`. */
export const SPORT_DATA_DIR = fileURLToPath(new URL('./data', import.meta.url));

export const SPORT_DATA_EXTENSION = '.json';
