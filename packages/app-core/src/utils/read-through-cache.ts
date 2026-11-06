import { AppErrorCode } from '../enums/app-error-code.ts';
import { AppError } from '../errors/app-error.ts';
import type { ReadThroughCacheOptions } from '../types.ts';
import { isNetworkFailure } from './is-network-failure.ts';

/**
 * Online: fetch, remember the answer and return it. Offline, or when the fetch cannot reach the
 * server: return what was remembered last, or reject `AppErrorCode.Offline` when nothing was.
 * Any other failure (the server said no) rejects as it is.
 */
export async function readThroughCache<T>({
  isOnline,
  load,
  save,
  cached,
}: ReadThroughCacheOptions<T>): Promise<T> {
  if (isOnline()) {
    try {
      const fresh = await load();
      await save(fresh);
      return fresh;
    } catch (thrown) {
      if (!isNetworkFailure(thrown)) throw thrown;
    }
  }
  const remembered = await cached();
  if (remembered === undefined) throw new AppError(AppErrorCode.Offline);
  return remembered;
}
