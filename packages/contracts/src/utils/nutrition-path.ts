import { ApiPath } from '../enums/api-path.ts';
import type { NutritionSubpath } from '../enums/nutrition-subpath.ts';

/** `/nutrition`, or `/nutrition/setup`; shared by the client and the server's routes. */
export function nutritionPath(subpath?: NutritionSubpath): string {
  return subpath === undefined ? ApiPath.Nutrition : `${ApiPath.Nutrition}/${subpath}`;
}
