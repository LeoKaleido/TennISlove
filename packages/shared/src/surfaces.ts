// Superfici dei campi: ogni circolo ha le sue, la partita si gioca su una di quelle (D-075).

export const SURFACES = ['TERRA', 'CEMENTO', 'ERBA_SINTETICA', 'SINTETICO'] as const;
export type Surface = (typeof SURFACES)[number];

/** Nome mostrato; "Sintetico" in attesa del nome esatto (tipo Mantoflex) da Giuseppe */
export const SURFACE_LABEL: Record<Surface, string> = {
  TERRA: 'Terra rossa',
  CEMENTO: 'Cemento',
  ERBA_SINTETICA: 'Erba sintetica',
  SINTETICO: 'Sintetico',
};

/** Superfici di un circolo nell'ordine dell'elenco, senza voci sconosciute */
export const clubSurfaces = (list: readonly string[]): Surface[] => SURFACES.filter((s) => list.includes(s));
