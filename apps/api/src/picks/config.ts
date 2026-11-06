/** Longest reason an AI gives for one pick; stored on the Session exercise, never shown. */
export const PICK_REASON_MAX_LENGTH = 200;

/**
 * Names the prompt and schema a Session was picked with (stored as the Session's `prompt_version`).
 * Change it with every change to `build-picks-prompt.ts` or `picks-schema.ts`: the evaluation set
 * runs in CI when they change, and stored Sessions say which version made them.
 */
export const SESSION_PICKS_PROMPT_VERSION = 'session-picks-v1';

/** One call, plus one retry when the answer fails the validators (spec "AI layer", Fallbacks). */
export const SESSION_PICKS_MAX_ATTEMPTS = 2;
