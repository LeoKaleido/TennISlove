// Simulatore "cosa mi serve per salire" (D-066): la classifica se una partita finisse in un certo modo.

import type { MatchScoreInput } from './scoring';
import { computeStandings, type StandingRow, type StandingsMatch, type StandingsOptions } from './standings';

type Games = [number, number];

/** Risultati tipici, visti da chi guarda (primo numero = i suoi game) */
export const SCENARIOS: { label: string; sets: [Games, Games, Games | null] }[] = [
  { label: 'Vinci 6-0 6-0', sets: [[6, 0], [6, 0], null] },
  { label: 'Vinci 6-3 6-3', sets: [[6, 3], [6, 3], null] },
  { label: 'Vinci 7-6 7-6', sets: [[7, 6], [7, 6], null] },
  { label: 'Vinci al super tie break', sets: [[4, 6], [6, 4], [10, 8]] },
  { label: 'Perdi al super tie break', sets: [[6, 4], [4, 6], [8, 10]] },
  { label: 'Perdi 6-7 6-7', sets: [[6, 7], [6, 7], null] },
  { label: 'Perdi 3-6 3-6', sets: [[3, 6], [3, 6], null] },
  { label: 'Perdi 0-6 0-6', sets: [[0, 6], [0, 6], null] },
];

/** Il punteggio di uno scenario nel verso della partita: se chi guarda è il giocatore B, i game si invertono */
export function scenarioScore(sets: [Games, Games, Games | null], viewerIsA: boolean): MatchScoreInput {
  const pair = (g: Games) => (viewerIsA ? { a: g[0], b: g[1] } : { a: g[1], b: g[0] });
  return { timeExpired: false, set1: pair(sets[0]), set2: pair(sets[1]), stb: sets[2] && pair(sets[2]) };
}

/** Classifica con una partita in più, giocata con quel punteggio */
export function standingsIf(playerIds: string[], played: StandingsMatch[], extra: StandingsMatch, opts: StandingsOptions = {}): StandingRow[] {
  return computeStandings(playerIds, [...played, extra], opts);
}
