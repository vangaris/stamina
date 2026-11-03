// The Node-only interface of the sport catalogue: reading the launch data files, seeding them into
// the database (migrations, tests) and drafting a profile with the AI provider (the founder's
// script). The Worker never imports this file; it uses `index.ts`, and `worker-bundle.test.ts`
// fails if the data, loader, sync or drafting end up in the Worker bundle.
export { SPORT_DATA_DIR } from './config.ts';
export { draftSportProfile, type DraftSportProfileOptions } from './draft-sport-profile.ts';
export { loadLaunchSports } from './load-launch-sports.ts';
export { SportDataError } from './sport-data-error.ts';
export { SportDraftError } from './sport-draft-error.ts';
export { syncLaunchSports } from './sync-launch-sports.ts';
