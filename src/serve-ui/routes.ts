/**
 * Rutas y paths de la UI Vitacore.
 * Una sola fuente de verdad para evitar magic strings y desvíos.
 */

/** Rutas de API (backend). */
export const API = {
  DB_SOURCES: "/api/db-sources",
  GRAPH: "/api/graph",
  AGENDA: "/api/agenda",
  ANALYTICS: "/api/analytics",
  DIAGNOSTIC: "/api/diagnostic",
} as const;

/** Rutas de navegación y estáticos (front). */
export const PAGES = {
  ROOT: "/",
  INDEX: "/index.html",
  AGENDA: "/agenda.html",
} as const;

export type ApiRoute = (typeof API)[keyof typeof API];
