import Dexie from 'dexie';
import { LOCAL_DATABASE } from '../config.ts';
import type { LocalDatabaseOptions } from '../types.ts';

/**
 * Opens (lazily, on first use) the device's IndexedDB database. Pass a fake `indexedDB` in tests;
 * a new factory is a new, empty database. Dexie fails on first use, not here, where there is no IndexedDB.
 */
export function createLocalDatabase(options: LocalDatabaseOptions = {}): Dexie {
  const database = new Dexie(LOCAL_DATABASE.name, options);
  database.version(LOCAL_DATABASE.version).stores(LOCAL_DATABASE.schema);
  return database;
}
