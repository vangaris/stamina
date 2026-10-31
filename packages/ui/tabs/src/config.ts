/** Elements that make a tab panel's content keyboard-reachable. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"]), [contenteditable=""], [contenteditable="true"]';

/** The visible (active) tab panel inside the Tabs root. */
export const ACTIVE_PANEL_SELECTOR = '[role="tabpanel"]:not([hidden])';
