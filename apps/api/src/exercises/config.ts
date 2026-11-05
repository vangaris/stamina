import { fileURLToPath } from 'node:url';

/** Where the curated library lives: one JSON array of `exerciseSchema` entries per group file. */
export const EXERCISE_DATA_DIR = fileURLToPath(new URL('./data', import.meta.url));

export const EXERCISE_DATA_EXTENSION = '.json';
