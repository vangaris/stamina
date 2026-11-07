import type { StopFlag } from '@stamina/domain';
import { STOP_FLAG_OPTIONS } from '../config.ts';
import { StopFlagStorageKey } from '../enums/stop-flag-storage-key.ts';
import type { RecheckOwedStorage, RecheckOwedStore } from '../types.ts';

function isStopFlag(value: unknown): value is StopFlag {
  return STOP_FLAG_OPTIONS.some((flag) => flag === value);
}

function parseFlags(raw: string | null): StopFlag[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? [...new Set(parsed.filter(isStopFlag))] : [];
  } catch {
    return [];
  }
}

/**
 * Keeps which stop flags still owe the person their repeated Screening questions, in `storage`,
 * so a sheet closed or a page reloaded before the questions were answered cannot lose them. Only
 * flag names are kept, never answers. Storage that is missing, full or blocked is not an error:
 * nothing is owed then, which is how it was before.
 */
export function createRecheckOwedStore(storage: RecheckOwedStorage): RecheckOwedStore {
  const read = (): StopFlag[] => {
    try {
      return parseFlags(storage.getItem(StopFlagStorageKey.RecheckOwed));
    } catch {
      return [];
    }
  };
  const write = (flags: readonly StopFlag[]) => {
    try {
      if (flags.length === 0) storage.removeItem(StopFlagStorageKey.RecheckOwed);
      else storage.setItem(StopFlagStorageKey.RecheckOwed, JSON.stringify(flags));
    } catch {
      // Nowhere to keep it.
    }
  };
  return {
    owed: read,
    owe(flag) {
      const flags = read();
      if (!flags.includes(flag)) write([...flags, flag]);
    },
    settle(flag) {
      write(read().filter((owed) => owed !== flag));
    },
  };
}
