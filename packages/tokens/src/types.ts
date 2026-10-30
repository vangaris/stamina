export type TokenTree = { [key: string]: unknown };

export interface TokenSources {
  /** Tier 1: raw values. The only file a brand theme replaces. */
  primitive: TokenTree;
  /** Tier 2, theme-independent: type, spacing, radius, motion. */
  base: TokenTree;
  /** Tier 2 colour roles per theme. */
  light: TokenTree;
  dark: TokenTree;
}

export interface Token {
  path: string[];
  type: string | undefined;
  value: unknown;
}
