import type { messages } from './config.ts';
import type { Locale } from './enums/locale.ts';

export type MessageTree = { [key: string]: string | MessageTree };
export type MessageSchema = (typeof messages)[Locale.En];
