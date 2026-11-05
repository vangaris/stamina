import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** One small valid file per launch sport (same shape as the real data, made-up numbers). */
export const FIXTURE_SPORT_DIR = fileURLToPath(new URL('./sport-data', import.meta.url));

/** A writable copy of the fixture sports, so a test can rewrite it. Remove it with `remove()`. */
export interface FixtureSportsCopy {
  dir: string;
  /** Writes a file of the copy: a string as is, anything else as formatted JSON. */
  write(file: string, content: unknown): Promise<void>;
  remove(): Promise<void>;
}

export async function copyFixtureSports(): Promise<FixtureSportsCopy> {
  const dir = await mkdtemp(join(tmpdir(), 'stamina-sports-'));
  await cp(FIXTURE_SPORT_DIR, dir, { recursive: true });
  return {
    dir,
    write: (file: string, content: unknown) =>
      writeFile(
        join(dir, file),
        typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`,
      ),
    remove: () => rm(dir, { recursive: true, force: true }),
  };
}
