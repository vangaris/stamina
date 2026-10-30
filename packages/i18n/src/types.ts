import type { messages } from './config.ts';

export type Locale = 'en' | 'el';
export type MessageTree = { [key: string]: string | MessageTree };
export type MessageSchema = (typeof messages)['en'];
