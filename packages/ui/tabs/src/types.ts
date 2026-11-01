export interface TabsItem {
  /** Stable id: the `v-model` value and the name of this tab's panel slot. */
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabsItem[];
  /** Accessible name of the tab list. */
  label: string;
}
