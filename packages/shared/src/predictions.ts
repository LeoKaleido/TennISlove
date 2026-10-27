// Pronostici tra giocatori (D-061): punti a parte, non toccano la classifica del torneo.
// Specifica: brain/01-product.md §9.

import { evaluateMatch, type MatchScoreInput, type Side } from './scoring';

/** Come vince: in 2 set o al super tie break */
export type PredictionHow = 'TWO_SETS' | 'SUPER_TIEBREAK';

export interface PredictionPick {
  playerId: string;
  pick: Side;
  how: PredictionHow | null;
}

export const PREDICTION_POINTS = {
  winner: 2,
  /** modo giusto, solo se anche il vincitore è giusto */
  how: 1,
  /** colpo grosso: vincitore giusto scelto da non più di 1 votante su 4 */
  upset: 2,
} as const;

export const UPSET_MAX_SHARE = 1 / 4;

export interface PredictionScore {
  playerId: string;
  points: number;
  winner: boolean;
  how: boolean;
  upset: boolean;
}

/** Si pronostica finché non c'è un risultato e la partita non è iniziata */
export function predictionsOpen(m: { scheduledAt: Date | string | null; hasResult: boolean }, now: Date = new Date()): boolean {
  if (m.hasResult) return false;
  return !m.scheduledAt || now < new Date(m.scheduledAt);
}

/**
 * Punti di ciascun pronostico di una partita.
 * `null` se il pronostico è annullato: nessun risultato valido o tempo scaduto senza vincitore.
 */
export function scorePredictions(picks: PredictionPick[], score: MatchScoreInput | null): PredictionScore[] | null {
  if (!score) return null;
  const ev = evaluateMatch(score);
  if (ev.status !== 'OK' || !ev.winner) return null;
  const right = picks.filter((p) => p.pick === ev.winner).length;
  const upset = right > 0 && right / picks.length <= UPSET_MAX_SHARE;
  return picks.map((p) => {
    const winner = p.pick === ev.winner;
    const how = winner && p.how !== null && p.how === ev.how;
    const isUpset = winner && upset;
    return {
      playerId: p.playerId,
      points: (winner ? PREDICTION_POINTS.winner : 0) + (how ? PREDICTION_POINTS.how : 0) + (isUpset ? PREDICTION_POINTS.upset : 0),
      winner,
      how,
      upset: isUpset,
    };
  });
}

export interface PredictionMatch {
  picks: PredictionPick[];
  /** risultato che conta (provvisorio o confermato), altrimenti null */
  score: MatchScoreInput | null;
}

export interface PredictionStandingRow {
  playerId: string;
  position: number;
  points: number;
  /** pronostici su partite concluse con un vincitore */
  played: number;
  /** vincitori indovinati */
  correct: number;
  upsets: number;
}

/** Classifica dei pronostici: punti, poi vincitori indovinati; a pari tutto, stessa posizione */
export function computePredictionStandings(playerIds: string[], matches: PredictionMatch[]): PredictionStandingRow[] {
  const rows = new Map<string, PredictionStandingRow>(
    playerIds.map((id) => [id, { playerId: id, position: 0, points: 0, played: 0, correct: 0, upsets: 0 }]),
  );
  for (const m of matches) {
    for (const s of scorePredictions(m.picks, m.score) ?? []) {
      const r = rows.get(s.playerId);
      if (!r) continue;
      r.points += s.points;
      r.played += 1;
      if (s.winner) r.correct += 1;
      if (s.upset) r.upsets += 1;
    }
  }
  // sort stabile: a pari merito resta l'ordine dell'elenco iniziale
  const sorted = [...rows.values()].sort((a, b) => b.points - a.points || b.correct - a.correct);
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    r.position = prev && prev.points === r.points && prev.correct === r.correct ? prev.position : i + 1;
  });
  return sorted;
}
