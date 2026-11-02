// Usage: pnpm --filter @stamina/api exec tsx scripts/validate-exercise-data.ts <file.json>...
// Checks each file against `exerciseSchema`, ids unique across all files, and that easier/harder
// links resolve (a link outside the given files is reported, not failed, so a group can be checked alone).
import { readFileSync } from 'node:fs';
import { exerciseSchema } from '@stamina/contracts';
import { z } from 'zod';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: validate-exercise-data.ts <file.json>...');
  process.exit(2);
}

const all: z.infer<typeof exerciseSchema>[] = [];
let failed = false;
for (const file of files) {
  const parsed = z.array(exerciseSchema).safeParse(JSON.parse(readFileSync(file, 'utf-8')));
  if (!parsed.success) {
    failed = true;
    console.error(`${file}: ${z.prettifyError(parsed.error)}`);
    continue;
  }
  all.push(...parsed.data);
}

const ids = new Set<string>();
for (const exercise of all) {
  if (ids.has(exercise.id)) {
    failed = true;
    console.error(`duplicate id ${exercise.id}`);
  }
  ids.add(exercise.id);
}
for (const exercise of all) {
  for (const [name, target] of [
    ['easierId', exercise.easierId],
    ['harderId', exercise.harderId],
  ] as const) {
    if (target === exercise.id) {
      failed = true;
      console.error(`${exercise.id}: ${name} points at itself`);
    } else if (target !== null && !ids.has(target)) {
      console.warn(`${exercise.id}: ${name} ${target} is not in the given files`);
    }
  }
}

const count = (pick: (e: (typeof all)[number]) => readonly string[]) => {
  const counts: Record<string, number> = {};
  for (const e of all) for (const value of pick(e)) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
};
console.log(`${all.length} exercises, ${all.filter((e) => e.image).length} with an image`);
console.log(
  'slots',
  count((e) => e.slots),
);
console.log(
  'patterns',
  count((e) => [e.movementPattern]),
);
console.log(
  'equipment',
  count((e) => (e.equipment.length === 0 ? ['(bodyweight)'] : e.equipment)),
);
console.log(
  'locations',
  count((e) => e.locations),
);
if (failed) process.exit(1);
