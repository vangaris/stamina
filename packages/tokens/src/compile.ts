/**
 * Compiles the DTCG token files into one CSS file: CSS variables for light and dark, plus the
 * Tailwind v4 `@theme` mapping that makes semantic roles the only colours, sizes and spacing
 * Tailwind can generate. Pure: no file access, so tests and the build script share it.
 */

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

interface Token {
  path: string[];
  type: string | undefined;
  value: unknown;
}

const ALIAS = /^\{([^{}]+)\}$/;

function isToken(node: unknown): node is { $value: unknown; $type?: string } {
  return typeof node === 'object' && node !== null && '$value' in node;
}

/** Flattens a DTCG tree to tokens in document order; `$type` is inherited from the nearest group. */
export function flatten(tree: TokenTree, path: string[] = [], type?: string): Token[] {
  const groupType = typeof tree.$type === 'string' ? tree.$type : type;
  const tokens: Token[] = [];
  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith('$') || typeof node !== 'object' || node === null) continue;
    if (isToken(node)) {
      const own = typeof node.$type === 'string' ? node.$type : groupType;
      tokens.push({ path: [...path, key], type: own, value: node.$value });
    } else {
      tokens.push(...flatten(node as TokenTree, [...path, key], groupType));
    }
  }
  return tokens;
}

function lookup(primitives: Map<string, Token>, ref: string, seen: string[] = []): Token {
  if (seen.includes(ref)) throw new Error(`Token alias cycle: ${[...seen, ref].join(' -> ')}`);
  const token = primitives.get(ref);
  if (!token) throw new Error(`Token alias {${ref}} does not exist in the primitive tier`);
  const next = typeof token.value === 'string' ? ALIAS.exec(token.value) : null;
  return next?.[1] ? lookup(primitives, next[1], [...seen, ref]) : token;
}

function format(token: Token): string {
  const { value, type } = token;
  if (Array.isArray(value)) {
    return value.map((v) => (/\s/.test(String(v)) ? `"${String(v)}"` : String(v))).join(', ');
  }
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  throw new Error(`Unsupported value for ${token.path.join('.')} (${type ?? 'untyped'})`);
}

/** Resolves a semantic token's aliases against the primitive tier. */
function resolveAll(tree: TokenTree, primitives: Map<string, Token>): Token[] {
  return flatten(tree).map((token) => {
    const ref = typeof token.value === 'string' ? ALIAS.exec(token.value) : null;
    if (!ref?.[1]) throw new Error(`${token.path.join('.')} must alias a primitive token`);
    const target = lookup(primitives, ref[1]);
    return { ...token, value: target.value };
  });
}

const cssName = (path: string[]) => `--st-${path.join('-')}`;

/** Tailwind theme variable for a semantic token, or undefined when Tailwind has no use for it. */
function tailwindName(path: string[]): string | undefined {
  const [group, ...rest] = path;
  const name = rest.join('-');
  switch (group) {
    case 'color':
      return `--color-${name}`;
    case 'radius':
      return `--radius-${name}`;
    case 'space':
      return `--spacing-${name}`;
    case 'font':
      if (rest[0] === 'family') return `--font-${rest.slice(1).join('-')}`;
      if (rest[0] === 'size') return `--text-${rest.slice(1).join('-')}`;
      if (rest[0] === 'leading') return `--text-${rest.slice(1).join('-')}--line-height`;
      return undefined;
    case 'duration':
      return name === 'base' ? '--default-transition-duration' : undefined;
    default:
      return undefined;
  }
}

/** Namespaces whose Tailwind defaults are wiped, so only semantic roles can generate utilities. */
const RESET = [
  '--color-*',
  '--font-*',
  '--text-*',
  '--spacing-*',
  '--radius-*',
  '--shadow-*',
  '--inset-shadow-*',
  '--drop-shadow-*',
] as const;

const declarations = (tokens: Token[], indent: string) =>
  tokens.map((t) => `${indent}${cssName(t.path)}: ${format(t)};`).join('\n');

export function compileTokens(src: TokenSources): string {
  const primitives = new Map(flatten(src.primitive).map((t) => [t.path.join('.'), t]));
  const base = resolveAll(src.base, primitives);
  const light = resolveAll(src.light, primitives);
  const dark = resolveAll(src.dark, primitives);

  const roles = (tokens: Token[]) => tokens.map((t) => t.path.join('.')).sort();
  const missing = roles(light).filter((r) => !roles(dark).includes(r));
  const extra = roles(dark).filter((r) => !roles(light).includes(r));
  if (missing.length || extra.length) {
    throw new Error(
      `Light and dark must define the same roles. Missing in dark: [${missing}]; only in dark: [${extra}]`,
    );
  }

  const themeLines = [...base, ...light].flatMap((t) => {
    const name = tailwindName(t.path);
    return name ? [`  ${name}: var(${cssName(t.path)});`] : [];
  });

  return `${[
    '/* Generated by packages/tokens/scripts/generate.ts from the *.tokens.json files. Do not edit. */',
    '',
    '/* Only semantic roles become Tailwind utilities; the default palette and scales are removed. */',
    '@theme inline {',
    ...RESET.map((r) => `  ${r}: initial;`),
    ...themeLines,
    '}',
    '',
    ':root {',
    declarations(base, '  '),
    '}',
    '',
    ":root,\n[data-theme='light'] {",
    '  color-scheme: light;',
    declarations(light, '  '),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    "  :root:not([data-theme='light']) {",
    '    color-scheme: dark;',
    declarations(dark, '    '),
    '  }',
    '}',
    '',
    "[data-theme='dark'] {",
    '  color-scheme: dark;',
    declarations(dark, '  '),
    '}',
    '',
    '/* Reduced motion: every transition and animation collapses, so no component needs its own switch. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  *,',
    '  *::before,',
    '  *::after {',
    '    animation-duration: 0.01ms !important;',
    '    animation-iteration-count: 1 !important;',
    '    transition-duration: 0.01ms !important;',
    '    scroll-behavior: auto !important;',
    '  }',
    '}',
  ].join('\n')}\n`;
}
