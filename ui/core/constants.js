/**
 * Constantes compartidas para layout y gráfico.
 * Única fuente de verdad para radios y dimensiones.
 */

export const SVG_SIZE = 640;
export const CENTER = SVG_SIZE / 2;

/** @type {Record<string, number>} */
export const NODE_R = {
  macro: 36,
  session: 22,
  step: 14,
  paradox: 18,
  refactor: 18,
};

export const POLL_INTERVAL_MS = 8000;

export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.25;
