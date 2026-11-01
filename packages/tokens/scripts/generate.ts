import { writeFile } from 'node:fs/promises';
import { compileTokens, sources } from '../src/index.ts';

const out = new URL('../src/tokens.css', import.meta.url);
await writeFile(out, compileTokens(sources));
console.log(`wrote ${out.pathname}`);
