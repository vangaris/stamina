import type { checkin } from '../db/schema.ts';

export type CheckinRow = typeof checkin.$inferSelect;
