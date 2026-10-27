// Badge dei giocatori (D-062): calcolati dai risultati, mai salvati.
// Specifica: brain/01-product.md §10.

import { evaluateMatch, type MatchScoreInput, type Side } from './scoring';
import { computeStandings } from './standings';

export type BadgeId =
  | 'FIRST_WIN'
  | 'BAGEL'
  | 'COMEBACK'
  | 'WALL'
  | 'STREAK'
  | 'TIEBREAK_KING'
  | 'GIANT_KILLER'
  | 'PHOTOGRAPHER'
  | 'SEER'
  | 'UPSET'
  | 'CHAMPION'
  | 'ORACLE'
  | 'PODIUM'
  | 'PRESENCE'
  | 'VETERAN';

export const BADGES: Record<BadgeId, { name: string; rule: string; target: number }> = {
  FIRST_WIN: { name: 'Prima vittoria', rule: 'Vinci la prima partita', target: 1 },
  BAGEL: { name: 'Cappotto', rule: 'Vinci un set 6-0', target: 1 },
  COMEBACK: { name: 'Rimonta', rule: 'Vinci dopo aver perso il primo set', target: 1 },
  WALL: { name: 'Muro', rule: 'Vinci concedendo al massimo 3 game', target: 1 },
  STREAK: { name: 'Tris', rule: '3 vittorie di fila', target: 3 },
  TIEBREAK_KING: { name: 'Re del tie break', rule: '3 partite vinte al super tie break', target: 3 },
  GIANT_KILLER: { name: 'Ammazza grandi', rule: 'Batti chi è primo in classifica', target: 1 },
  PHOTOGRAPHER: { name: 'Fotografo', rule: 'Foto in 3 delle tue partite', target: 3 },
  SEER: { name: 'Indovino', rule: '5 pronostici con il vincitore giusto', target: 5 },
  UPSET: { name: 'Colpo grosso', rule: 'Indovina uno sfavorito nei pronostici', target: 1 },
  CHAMPION: { name: 'Campione', rule: 'Vinci il torneo', target: 1 },
  ORACLE: { name: 'Oracolo', rule: 'Primo nei pronostici a fine stagione', target: 1 },
  PODIUM: { name: 'Podio', rule: 'Tra i primi 3 a fine stagione', target: 1 },
  PRESENCE: { name: 'Presenze', rule: 'Un livello per ogni torneo a cui partecipi', target: 1 },
  VETERAN: { name: 'Veterano', rule: 'Un livello per ogni anno di iscrizione', target: 1 },
};

/** Lunghezza massima dei nomi: stanno su due righe sotto la medaglia, senza spezzare le parole */
export const BADGE_NAME_MAX = { total: 16, word: 10 };

export const BADGE_ORDER = Object.keys(BADGES) as BadgeId[];

/** Muro: game concessi al massimo in una vittoria */
const WALL_MAX_GAMES = 3;

export interface BadgeMatch {
  id: string;
  playerAId: string;
  playerBId: string;
  /** risultato che conta (provvisorio o confermato), altrimenti null */
  score: MatchScoreInput | null;
  /** per l'ordine: giorno giocato (YYYY-MM-DD) e, a parità, quando è stato inserito il risultato */
  playedOn: string | null;
  submittedAt: string | null;
  photoCount: number;
}

export interface BadgeInput {
  playerId: string;
  /** tutti i giocatori della stagione, nell'ordine dell'elenco iniziale (serve ad Ammazza grandi) */
  playerIds: string[];
  matches: BadgeMatch[];
  predictions: { correct: number; upsets: number } | null;
  /** solo a stagione chiusa */
  final: { championId: string | null; position: number | null; predictionPosition: number | null; predictionPoints: number } | null;
}

export interface BadgeState {
  id: BadgeId;
  earned: boolean;
  /** livello: quante volte è stato ottenuto in questa stagione */
  times: number;
  /** avanzamento verso il prossimo livello, da 0 a `target` */
  progress: number;
  target: number;
  /** la partita che ha dato ciascun livello, quando c'è */
  matchIds: string[];
}

const byPlayOrder = (a: BadgeMatch, b: BadgeMatch) =>
  (a.playedOn ?? '').localeCompare(b.playedOn ?? '') || (a.submittedAt ?? '').localeCompare(b.submittedAt ?? '');

/** Badge che si ottengono una sola volta per stagione: i livelli si sommano tra i tornei */
export const ONCE_PER_SEASON: BadgeId[] = ['FIRST_WIN', 'CHAMPION', 'ORACLE', 'PODIUM', 'PRESENCE'];

/** Badge di carriera: non dipendono da un torneo (Veterano: anni dall'iscrizione, vedi `membershipYears`) */
export const CAREER_BADGES: BadgeId[] = ['VETERAN'];

/**
 * Anni compiuti dall'iscrizione (`since`, YYYY-MM-DD) a oggi, e il giorno in cui si compie il prossimo.
 * Il 29 febbraio, negli anni non bisestili, l'anniversario è il 28.
 */
export function membershipYears(since: string, today: string): { years: number; nextOn: string } {
  const [y, m, d] = since.split('-').map(Number) as [number, number, number];
  const on = (year: number) => {
    const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
    return `${year}-${String(m).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
  };
  let years = Number(today.slice(0, 4)) - y;
  if (today < on(Number(today.slice(0, 4)))) years -= 1;
  years = Math.max(0, years);
  return { years, nextOn: on(y + years + 1) };
}

export function computeBadges(input: BadgeInput): BadgeState[] {
  const me = input.playerId;
  const played = input.matches.filter((m) => m.score && (m.playerAId === me || m.playerBId === me)).sort(byPlayOrder);
  const games = played.map((m) => {
    const side: Side = m.playerAId === me ? 'A' : 'B';
    const ev = evaluateMatch(m.score!);
    const mine = (g: { a: number; b: number }) => (side === 'A' ? g.a : g.b);
    const theirs = (g: { a: number; b: number }) => (side === 'A' ? g.b : g.a);
    return {
      m,
      won: ev.status === 'OK' && ev.winner === side,
      how: ev.how,
      sets: [m.score!.set1, m.score!.set2].filter((x): x is { a: number; b: number } => x !== null),
      mine,
      theirs,
      conceded: side === 'A' ? ev.gamesB : ev.gamesA,
    };
  });

  const states = new Map<BadgeId, BadgeState>(
    BADGE_ORDER.map((id) => [id, { id, earned: false, times: 0, progress: 0, target: BADGES[id].target, matchIds: [] }]),
  );
  /** Un livello in più; per quelli una volta a stagione conta solo il primo */
  const level = (id: BadgeId, matchId: string | null = null) => {
    const s = states.get(id)!;
    if (ONCE_PER_SEASON.includes(id) && s.times > 0) return;
    s.times += 1;
    s.earned = true;
    if (matchId) s.matchIds.push(matchId);
  };
  /** Badge a soglia (3 di questo, 5 di quello): un livello ogni `target`, l'avanzamento è il resto */
  const threshold = (id: BadgeId, value: number) => {
    const s = states.get(id)!;
    for (let t = s.times; t < Math.floor(value / s.target); t++) level(id);
    s.progress = value % s.target;
  };

  let streak = 0;
  let tiebreaks = 0;
  for (const g of games) {
    // un set vinto 6-0 conta anche in una partita persa
    for (const set of g.sets) if (g.mine(set) === 6 && g.theirs(set) === 0) level('BAGEL', g.m.id);
    streak = g.won ? streak + 1 : 0;
    if (!g.won) continue;
    if (streak % BADGES.STREAK.target === 0) level('STREAK', g.m.id);
    level('FIRST_WIN', g.m.id);
    if (g.sets[0] && g.mine(g.sets[0]) < g.theirs(g.sets[0])) level('COMEBACK', g.m.id);
    if (g.conceded <= WALL_MAX_GAMES) level('WALL', g.m.id);
    if (g.how === 'SUPER_TIEBREAK' && ++tiebreaks % BADGES.TIEBREAK_KING.target === 0) level('TIEBREAK_KING', g.m.id);
  }
  // per Tris conta la serie in corso, per il re del tie break le vittorie verso la prossima terna
  states.get('STREAK')!.progress = streak % BADGES.STREAK.target;
  states.get('TIEBREAK_KING')!.progress = tiebreaks % BADGES.TIEBREAK_KING.target;

  // Ammazza grandi: la classifica com'era subito prima di ciascuna vittoria
  const wins = games.filter((g) => g.won);
  if (wins.length > 0) {
    const all = input.matches.filter((m) => m.score).sort(byPlayOrder);
    for (const g of wins) {
      const before = all.slice(0, all.indexOf(g.m)).map((m) => ({ playerAId: m.playerAId, playerBId: m.playerBId, score: m.score! }));
      const table = computeStandings(input.playerIds, before, { qualifiers: 0 });
      const opp = table.find((r) => r.playerId === (g.m.playerAId === me ? g.m.playerBId : g.m.playerAId));
      if (opp && opp.position === 1 && opp.played > 0) level('GIANT_KILLER', g.m.id);
    }
  }

  threshold('PHOTOGRAPHER', input.matches.filter((m) => m.photoCount > 0 && (m.playerAId === me || m.playerBId === me)).length);
  if (input.predictions) {
    threshold('SEER', input.predictions.correct);
    for (let i = 0; i < input.predictions.upsets; i++) level('UPSET');
  }
  // chi è nell'elenco del torneo vi partecipa: un livello per torneo, sommati tra le stagioni
  if (input.playerIds.includes(me)) level('PRESENCE');
  if (input.final) {
    const f = input.final;
    if (f.championId === me) level('CHAMPION');
    if (f.predictionPosition === 1 && f.predictionPoints > 0) level('ORACLE');
    if (f.position !== null && f.position <= 3) level('PODIUM');
  }
  return BADGE_ORDER.map((id) => states.get(id)!);
}
