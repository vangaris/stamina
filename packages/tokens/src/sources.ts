import base from './semantic.base.tokens.json' with { type: 'json' };
import dark from './semantic.dark.tokens.json' with { type: 'json' };
import light from './semantic.light.tokens.json' with { type: 'json' };
import primitive from './primitive.tokens.json' with { type: 'json' };
import type { TokenSources } from './types.ts';

export const sources: TokenSources = { primitive, base, light, dark };
