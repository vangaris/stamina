/** Lower case without accents (Latin or Greek), with the Greek final sigma folded, for matching. */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ').trim();
}
