import { TEMPLATES } from '../data/templates.ts';
import type { MealTemplate } from '../types.ts';

const BY_ID = new Map<string, MealTemplate>(TEMPLATES.map((template) => [template.id, template]));

export function getTemplate(id: string): MealTemplate | undefined {
  return BY_ID.get(id);
}
