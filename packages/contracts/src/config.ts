/**
 * Control, format (zero-width, bidi) and line/paragraph separator characters, and the blank
 * "filler" letters: none of them shows, so a name made of them would be invisible catalogue text.
 */
export const INVISIBLE_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\u115f\u1160\u3164\uffa0]/u;

/**
 * Longest ingredient or template id the API accepts. Ids are checked for shape only, never against
 * the bundled food data: a newer app may log a dish this server's data does not have yet.
 */
export const FOOD_ID_MAX_LENGTH = 64;
