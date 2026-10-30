/**
 * Compiles the DTCG token files into one CSS file: CSS variables for light and dark, plus the
 * Tailwind v4 `@theme` mapping that makes semantic roles the only colours, sizes and spacing
 * Tailwind can generate. Pure: no file access, so tests and the build script share it.
 */
import {
  FOCUS_RING_LINES,
  HEADER_COMMENT,
  REDUCED_MOTION_LINES,
  RESET,
  THEME_COMMENT,
} from './config.ts';
import type { TokenSources } from './types.ts';
import { assertSameRoles } from './utils/assert-same-roles.ts';
import { cssName } from './utils/css-name.ts';
import { declarations } from './utils/declarations.ts';
import { flatten } from './utils/flatten.ts';
import { resolveAll } from './utils/resolve-all.ts';
import { tailwindName } from './utils/tailwind-name.ts';

export function compileTokens(src: TokenSources): string {
  const primitives = new Map(flatten(src.primitive).map((t) => [t.path.join('.'), t]));
  const base = resolveAll(src.base, primitives);
  const light = resolveAll(src.light, primitives);
  const dark = resolveAll(src.dark, primitives);
  assertSameRoles(light, dark);

  const themeLines = [...base, ...light].flatMap((t) => {
    const name = tailwindName(t.path);
    return name ? [`  ${name}: var(${cssName(t.path)});`] : [];
  });

  return `${[
    HEADER_COMMENT,
    '',
    THEME_COMMENT,
    '@theme inline {',
    ...RESET.map((r) => `  ${r}: initial;`),
    ...themeLines,
    '}',
    '',
    ...FOCUS_RING_LINES,
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
    ...REDUCED_MOTION_LINES,
  ].join('\n')}\n`;
}
