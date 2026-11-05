/**
 * Control, format (zero-width, bidi) and line/paragraph separator characters, and the blank
 * "filler" letters: none of them shows, so a name made of them would be invisible catalogue text.
 */
export const INVISIBLE_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\u115f\u1160\u3164\uffa0]/u;
