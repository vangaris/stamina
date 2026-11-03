/**
 * The key that makes two spellings of one requested sport the same request: case, accents,
 * surrounding and repeated spaces do not matter ("Beach  Tennis" and "beach tennis" are one).
 */
export function normalizeSportName(name: string): string {
  return name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
