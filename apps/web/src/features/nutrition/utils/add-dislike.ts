import { MAX_DISLIKE_LENGTH, MAX_DISLIKES } from '@stamina/domain';

/**
 * The dislikes with one more food added: trimmed and cut to the longest a dislike may be. Blank
 * text, a dislike already there (in any letter case) and a full list leave the list as it is.
 */
export function addDislike(dislikes: readonly string[], text: string): string[] {
  const dislike = text.trim().slice(0, MAX_DISLIKE_LENGTH).trim();
  const known = dislikes.some((item) => item.toLowerCase() === dislike.toLowerCase());
  if (!dislike || known || dislikes.length >= MAX_DISLIKES) return [...dislikes];
  return [...dislikes, dislike];
}
