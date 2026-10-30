import { CSS_VAR_PREFIX } from '../config.ts';

/** The CSS variable a token is emitted as: `['color', 'bg']` -> `--st-color-bg`. */
export const cssName = (path: string[]) => `${CSS_VAR_PREFIX}${path.join('-')}`;
