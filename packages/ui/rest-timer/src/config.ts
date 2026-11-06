export const SECONDS_PER_MINUTE = 60;

/** Announce every this many seconds while time remains... */
export const ANNOUNCE_EVERY_SECONDS = 10;
/** ...and every second once this few remain (including 0). */
export const ANNOUNCE_LAST_SECONDS = 5;

/** Ring geometry, in SVG user units (the `viewBox` is `0 0 RING_VIEWBOX RING_VIEWBOX`). */
export const RING_VIEWBOX = 100;
export const RING_STROKE_WIDTH = 6;
export const RING_RADIUS = (RING_VIEWBOX - RING_STROKE_WIDTH) / 2;

/** Elements that take part in Tab order inside the dialog. */
export const TABBABLE_SELECTOR = 'button:not([disabled])';
