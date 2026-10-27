// Andamento in classifica: la classifica com'era alla fine di ogni giornata.

import { computeStandings, type StandingRow, type StandingsMatch } from './standings';

export interface TimelineMatch extends StandingsMatch {
  /** giorno in cui si è giocata (YYYY-MM-DD) */
  playedOn: string;
}

export interface TimelinePoint {
  round: number;
  rows: StandingRow[];
}

/**
 * Classifica a fine giornata, per le giornate già iniziate (`today` compreso).
 * Conta le partite giocate entro la fine della settimana, qualunque sia la loro giornata: un recupero
 * pesa nella settimana in cui si gioca.
 */
export function standingsTimeline(
  playerIds: string[],
  matches: TimelineMatch[],
  rounds: { number: number; startsOn: string; endsOn: string }[],
  today: string,
  qualifiers = 0,
): TimelinePoint[] {
  return rounds
    .filter((r) => r.startsOn <= today)
    .sort((a, b) => a.number - b.number)
    .map((r) => ({
      round: r.number,
      rows: computeStandings(
        playerIds,
        matches.filter((m) => m.playedOn <= r.endsOn),
        { qualifiers },
      ),
    }));
}
