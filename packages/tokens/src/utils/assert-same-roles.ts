import type { Token } from '../types.ts';

/** Throws unless light and dark define exactly the same role paths. */
export function assertSameRoles(light: Token[], dark: Token[]): void {
  const roles = (tokens: Token[]) => tokens.map((t) => t.path.join('.')).sort();
  const missing = roles(light).filter((r) => !roles(dark).includes(r));
  const extra = roles(dark).filter((r) => !roles(light).includes(r));
  if (missing.length || extra.length) {
    throw new Error(
      `Light and dark must define the same roles. Missing in dark: [${missing}]; only in dark: [${extra}]`,
    );
  }
}
