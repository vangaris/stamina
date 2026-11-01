import type { profile } from '../db/schema.ts';

export type ProfileRow = typeof profile.$inferSelect;
/** The answer columns of a profile row: everything but the key and the timestamps. */
export type ProfileValues = Omit<typeof profile.$inferInsert, 'userId' | 'createdAt' | 'updatedAt'>;
