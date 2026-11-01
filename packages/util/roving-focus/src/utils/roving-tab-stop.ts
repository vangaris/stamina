/** The one item that is in the Tab order: the selected enabled one, else the first enabled one. */
export function rovingTabStop(disabled: readonly boolean[], selected: number): number | undefined {
  const isEnabled = (i: number) => disabled[i] === false;
  if (isEnabled(selected)) return selected;
  const first = disabled.findIndex((d) => !d);
  return first === -1 ? undefined : first;
}
