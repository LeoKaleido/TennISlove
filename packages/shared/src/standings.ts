// Classifica del girone all'italiana.
// Specifica: brain/04-flows.md §5.4-5.6. Riproduce l'Excel del cliente, con gli scontri
// diretti calcolati correttamente (nell'Excel valgono sempre 0, vedi §5.7).

import { evaluateMatch, type MatchScoreInput } from './scoring';

export interface StandingsMatch {
  playerAId: string;
  playerBId: string;
  score: MatchScoreInput;
}

export type Zone = 'TOP' | 'CUT_TIE' | 'OUT' | 'TBD';

export interface StandingRow {
  playerId: string;
  position: number;
  points: number;
  played: number;
  won: number;
  lost: number;
  /** partite finite a tempo scaduto */
  noResult: number;
  gamesWon: number;
  gamesLost: number;
  gamesDiff: number;
  /** bonus vittoria + compensazioni */
  bonus: number;
  zone: Zone;
}

export interface StandingsOptions {
  /** quanti giocatori accedono alla fase finale (default 8) */
  qualifiers?: number;
}

/**
 * @param playerIds giocatori nell'ordine dell'elenco iniziale (usato solo per la visualizzazione degli ex aequo)
 * @param matches partite con risultato da conteggiare (provvisorie e confermate)
 */
export function computeStandings(
  playerIds: string[],
  matches: StandingsMatch[],
  options: StandingsOptions = {},
): StandingRow[] {
  const qualifiers = options.qualifiers ?? 8;
  const rows = new Map<string, StandingRow>();
  for (const id of playerIds) {
    rows.set(id, {
      playerId: id,
      position: 0,
      points: 0,
      played: 0,
      won: 0,
      lost: 0,
      noResult: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDiff: 0,
      bonus: 0,
      zone: 'TBD',
    });
  }

  // punti e vittorie negli scontri diretti: h2h[x][y] = quanto ha fatto x contro y
  const h2hPoints = new Map<string, Map<string, number>>();
  const h2hWins = new Map<string, Map<string, number>>();
  const add = (m: Map<string, Map<string, number>>, x: string, y: string, v: number) => {
    const inner = m.get(x) ?? new Map<string, number>();
    inner.set(y, (inner.get(y) ?? 0) + v);
    m.set(x, inner);
  };
  const get = (m: Map<string, Map<string, number>>, x: string, y: string) => m.get(x)?.get(y) ?? 0;

  for (const match of matches) {
    const ev = evaluateMatch(match.score);
    if (ev.status !== 'OK') continue;
    const a = rows.get(match.playerAId);
    const b = rows.get(match.playerBId);
    if (!a || !b) continue;

    a.played++;
    b.played++;
    a.gamesWon += ev.gamesA;
    a.gamesLost += ev.gamesB;
    b.gamesWon += ev.gamesB;
    b.gamesLost += ev.gamesA;
    a.bonus += ev.bonusA + ev.compensationA;
    b.bonus += ev.bonusB + ev.compensationB;
    a.points += ev.pointsA;
    b.points += ev.pointsB;
    if (ev.winner === 'A') {
      a.won++;
      b.lost++;
      add(h2hWins, a.playerId, b.playerId, 1);
    } else if (ev.winner === 'B') {
      b.won++;
      a.lost++;
      add(h2hWins, b.playerId, a.playerId, 1);
    } else {
      a.noResult++;
      b.noResult++;
    }
    add(h2hPoints, a.playerId, b.playerId, ev.pointsA);
    add(h2hPoints, b.playerId, a.playerId, ev.pointsB);
  }

  const all = [...rows.values()];
  for (const r of all) r.gamesDiff = r.gamesWon - r.gamesLost;

  // Criteri di spareggio (come le colonne "Criterio diretto" e "Diff. spareggio" dell'Excel)
  const crit = new Map<string, { direct: number; diff: number }>();
  for (const r of all) {
    const tied = all.filter((o) => o.points === r.points && o.playerId !== r.playerId);
    if (tied.length === 1) {
      // due a pari punti: scontro diretto (se non giocato o senza vincitore restano ex aequo)
      crit.set(r.playerId, { direct: get(h2hWins, r.playerId, tied[0]!.playerId), diff: 0 });
    } else if (tied.length >= 2) {
      // tre o più: punti negli scontri tra loro, poi differenza game complessiva
      const direct = tied.reduce((sum, o) => sum + get(h2hPoints, r.playerId, o.playerId), 0);
      crit.set(r.playerId, { direct, diff: r.gamesDiff });
    } else {
      crit.set(r.playerId, { direct: 0, diff: 0 });
    }
  }

  for (const r of all) {
    const c = crit.get(r.playerId)!;
    r.position =
      1 +
      all.filter((o) => {
        if (o.points !== r.points) return o.points > r.points;
        const oc = crit.get(o.playerId)!;
        if (oc.direct !== c.direct) return oc.direct > c.direct;
        return oc.diff > c.diff;
      }).length;
  }

  for (const r of all) {
    const samePosition = all.filter((o) => o.position === r.position).length;
    if (r.points === 0) r.zone = 'TBD';
    else if (r.position <= qualifiers && r.position + samePosition - 1 > qualifiers) r.zone = 'CUT_TIE';
    else if (r.position <= qualifiers) r.zone = 'TOP';
    else r.zone = 'OUT';
  }

  const order = new Map(playerIds.map((id, i) => [id, i]));
  return all.sort((x, y) => x.position - y.position || order.get(x.playerId)! - order.get(y.playerId)!);
}
