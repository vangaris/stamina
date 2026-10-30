export interface SheetProps {
  /** Visible heading; also the dialog's accessible name. */
  title: string;
  /** Accessible name of the close button (the icon has no text). */
  closeLabel: string;
  /** Close when the dimmed area above the sheet is pressed. */
  dismissOnScrim?: boolean;
}

/** The parts of a sheet that take part in Tab order, in order: close button, content, footer. */
export interface SheetTabRegions {
  dialog: HTMLDialogElement | null;
  closeButton: HTMLElement | null;
  scroller: HTMLElement | null;
  footer: HTMLElement | null;
}
