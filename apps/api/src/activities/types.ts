import type { activity } from '../db/schema.ts';

export type ActivityRow = typeof activity.$inferSelect;
