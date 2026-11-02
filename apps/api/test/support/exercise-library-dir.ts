import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Two small group files covering every enum value the filters branch on (see the files). */
export const FIXTURE_LIBRARY_DIR = fileURLToPath(new URL('./exercise-library', import.meta.url));

/** A writable copy of the fixture library, so a test can rewrite it. Remove it with `remove()`. */
export interface FixtureLibraryCopy {
  dir: string;
  /** Writes a file of the copy: a string as is, anything else as formatted JSON. */
  write(file: string, content: unknown): Promise<void>;
  remove(): Promise<void>;
}

export async function copyFixtureLibrary(): Promise<FixtureLibraryCopy> {
  const dir = await mkdtemp(join(tmpdir(), 'stamina-library-'));
  await cp(FIXTURE_LIBRARY_DIR, dir, { recursive: true });
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
