export interface LoadBarsWeek {
  /** Visible short label under the bar, e.g. "Oct 12". */
  label: string;
  /** Load already done; drawn solid. */
  done: number;
  /** Extra Load still planned; drawn dashed on top of `done`. */
  planned: number;
  /** Emphasise this week (the current one). */
  current?: boolean | undefined;
}

export interface LoadBarsProps {
  /** Oldest first. */
  weeks: LoadBarsWeek[];
  /** The usual Load per week; `null` draws no average line. */
  average: number | null;
  /** Accessible name of the chart (also the caption of its text alternative). */
  label: string;
  /** Name of the average line, e.g. "Your usual". */
  averageLabel: string;
  /** Name of the solid part, e.g. "Done". */
  doneLabel: string;
  /** Name of the dashed part, e.g. "Planned". */
  plannedLabel: string;
  /** Header of the week column in the text alternative, e.g. "Week". */
  weekLabel: string;
  /** Marks the current week's row in the text alternative, e.g. "this week". */
  currentLabel: string;
  /** BCP 47 tag the numbers in the text alternative are written in, e.g. "el". */
  locale: string;
}

export interface LoadBarsBar {
  /** Height of the solid part, 0-100 of the plot height. */
  donePercent: number;
  /** Height of the dashed part, 0-100 of the plot height. */
  plannedPercent: number;
}

export interface LoadBarsScale {
  /** Load value at the top of the plot. */
  max: number;
  bars: LoadBarsBar[];
  /** Height of the average line, 0-100, or `null` when there is no average. */
  averagePercent: number | null;
}
