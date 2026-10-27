// Generazione del calendario di un girone all'italiana (procedura "Nuovo torneo", D-028).

import { addDays, formatDay } from './dates';

export interface GeneratedRound {
  pairs: [string, string][];
  /** chi riposa nella giornata (numero dispari di giocatori) */
  bye: string | null;
}

/** Generatore pseudo-casuale deterministico: lo stesso seme dà lo stesso calendario */
function random(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

/**
 * Girone di sola andata con il metodo del cerchio: ognuno incontra tutti una volta,
 * una partita a giornata. Il seme rimescola l'ordine (pulsante "Rimescola accoppiamenti").
 */
export function roundRobin(playerIds: string[], seed = 1): GeneratedRound[] {
  const rnd = random(seed);
  const ids: (string | null)[] = [...playerIds];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  if (ids.length % 2) ids.push(null);
  const n = ids.length;
  const rounds: GeneratedRound[] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    let bye: string | null = null;
    for (let i = 0; i < n / 2; i++) {
      const x = ids[i]!;
      const y = ids[n - 1 - i]!;
      if (x === null) bye = y;
      else if (y === null) bye = x;
      // alterna chi è scritto per primo, come nel calendario del cliente
      else pairs.push(r % 2 ? [y, x] : [x, y]);
    }
    rounds.push({ pairs, bye });
    ids.splice(1, 0, ids.pop()!);
  }
  return rounds;
}

export interface Pause {
  /** primo giorno di pausa (YYYY-MM-DD) */
  from: string;
  /** ultimo giorno di pausa (YYYY-MM-DD) */
  to: string;
}

export interface Week {
  startsOn: string;
  endsOn: string;
  /** etichetta della pausa che segue la giornata */
  pauseAfter: string | null;
}

const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

function nextMonday(day: string) {
  let d = addDays(day, 1);
  while (weekday(d) !== 1) d = addDays(d, 1);
  return d;
}

export const pauseLabel = (p: Pause) => `Pausa, ${formatDay(p.from)} - ${formatDay(p.to)}`;

/**
 * Settimane delle giornate a partire da un lunedì, saltando le pause.
 * Una settimana interrotta da una pausa si accorcia e finisce il giorno prima (es. giornata 10: 14-18 dic).
 */
export function scheduleWeeks(start: string, count: number, pauses: Pause[] = []): Week[] {
  const sorted = [...pauses].sort((a, b) => a.from.localeCompare(b.from));
  const out: Week[] = [];
  let ws = start;
  for (let guard = 0; out.length < count && guard < 500; guard++) {
    const we = addDays(ws, 6);
    const hit = sorted.find((p) => p.from <= we && p.to >= ws);
    if (!hit) {
      out.push({ startsOn: ws, endsOn: we, pauseAfter: null });
      ws = addDays(ws, 7);
      continue;
    }
    if (hit.from > ws) {
      out.push({ startsOn: ws, endsOn: addDays(hit.from, -1), pauseAfter: pauseLabel(hit) });
    } else if (out.length && !out[out.length - 1]!.pauseAfter) {
      out[out.length - 1]!.pauseAfter = pauseLabel(hit);
    }
    ws = nextMonday(hit.to);
  }
  return out;
}

/** Controlla che il calendario sia un girone completo: ogni coppia una volta, nessuno due volte nella stessa giornata */
export function validateRoundRobin(playerIds: string[], rounds: [string, string][][]): string | null {
  const players = new Set(playerIds);
  const seen = new Set<string>();
  for (const [i, pairs] of rounds.entries()) {
    const busy = new Set<string>();
    for (const [a, b] of pairs) {
      if (!players.has(a) || !players.has(b) || a === b) return `Giornata ${i + 1}: giocatore non valido`;
      if (busy.has(a) || busy.has(b)) return `Giornata ${i + 1}: un giocatore gioca due volte`;
      busy.add(a);
      busy.add(b);
      const key = [a, b].sort().join('|');
      if (seen.has(key)) return `Giornata ${i + 1}: partita ripetuta`;
      seen.add(key);
    }
  }
  const expected = (playerIds.length * (playerIds.length - 1)) / 2;
  if (seen.size !== expected) return `Servono ${expected} partite, ce ne sono ${seen.size}`;
  return null;
}

/** Il torneo dimostrativo degli screenshot della guida (D-067): mai tra i tornei selezionabili */
export const DEMO_SEASON_NAME = 'Torneo dimostrativo';
