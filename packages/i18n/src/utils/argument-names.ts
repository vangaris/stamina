import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';

/** Names of the arguments an ICU message uses, including those inside plural/select branches. */
export function argumentNames(message: string): string[] {
  const names = new Set<string>();
  const visit = (elements: MessageFormatElement[]) => {
    for (const el of elements) {
      if (el.type === TYPE.literal || el.type === TYPE.pound) continue;
      names.add(el.value);
      if (el.type === TYPE.plural || el.type === TYPE.select) {
        for (const option of Object.values(el.options)) visit(option.value);
      } else if (el.type === TYPE.tag) {
        visit(el.children);
      }
    }
  };
  visit(parse(message));
  return [...names].sort();
}
