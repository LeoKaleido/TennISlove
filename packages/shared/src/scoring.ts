// Motore di punteggio di una singola partita.
// Specifica: brain/04-flows.md §5 (regolamento 21/10/2026 + formule dell'Excel del cliente).

export type Side = 'A' | 'B';

export interface GameScore {
  a: number;
  b: number;
}

export interface MatchScoreInput {
  /** true se le 2 ore sono finite senza un vincitore */
  timeExpired: boolean;
  set1: GameScore | null;
  set2: GameScore | null;
  /** punti del super tie break (non sono game) */
  stb: GameScore | null;
}

/** Esito di un set o del super tie break */
export type PartOutcome = Side | 'open' | 'empty' | 'invalid';

export type ScoreStatus =
  | 'OK'
  | 'EMPTY'
  | 'INVALID_SCORE'
  | 'INCOMPLETE'
  | 'WINNER_ON_TIMEOUT';

export interface MatchEvaluation {
  status: ScoreStatus;
  /** Messaggio per l'utente, equivalente alla colonna "Messaggio" dell'Excel */
  message: string;
  winner: Side | null;
  /** Vittoria in 2 set, al super tie break, oppure tempo scaduto */
  how: 'TWO_SETS' | 'SUPER_TIEBREAK' | 'TIME_EXPIRED' | null;
  gamesA: number;
  gamesB: number;
  /** +3 al vincitore (in 2 set: 3; al STB: 2 vittoria + 1 STB) */
  bonusA: number;
  bonusB: number;
  compensationA: number;
  compensationB: number;
  pointsA: number;
  pointsB: number;
}

const isWhole = (n: number) => Number.isInteger(n) && n >= 0;

export function setOutcome(s: GameScore | null): PartOutcome {
  if (!s) return 'empty';
  const { a, b } = s;
  if (!isWhole(a) || !isWhole(b) || a > 7 || b > 7) return 'invalid';
  if ((a === 6 && b <= 4) || (a === 7 && (b === 5 || b === 6))) return 'A';
  if ((b === 6 && a <= 4) || (b === 7 && (a === 5 || a === 6))) return 'B';
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  // Set non concluso: ammesso solo con tempo scaduto
  if (max <= 5 || (max === 6 && min >= 5)) return 'open';
  return 'invalid';
}

export function stbOutcome(s: GameScore | null): PartOutcome {
  if (!s) return 'empty';
  const { a, b } = s;
  if (!isWhole(a) || !isWhole(b)) return 'invalid';
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  const diff = max - min;
  if (max >= 10 && diff >= 2) {
    if ((max === 10 && min <= 8) || (min >= 9 && diff === 2)) return a > b ? 'A' : 'B';
    return 'invalid';
  }
  return 'open';
}

const decided = (o: PartOutcome): o is Side => o === 'A' || o === 'B';

const MESSAGES: Record<ScoreStatus, string> = {
  OK: 'OK',
  EMPTY: 'Da giocare',
  INVALID_SCORE: 'Verifica punteggio',
  INCOMPLETE: 'Punteggio incompleto',
  WINNER_ON_TIMEOUT: 'Vincitore definito: togli "Tempo scaduto"',
};

export function evaluateMatch(input: MatchScoreInput): MatchEvaluation {
  const o1 = setOutcome(input.set1);
  const o2 = setOutcome(input.set2);
  const o3 = stbOutcome(input.stb);

  const gamesA = (input.set1?.a ?? 0) + (input.set2?.a ?? 0);
  const gamesB = (input.set1?.b ?? 0) + (input.set2?.b ?? 0);

  const base: MatchEvaluation = {
    status: 'EMPTY',
    message: MESSAGES.EMPTY,
    winner: null,
    how: null,
    gamesA,
    gamesB,
    bonusA: 0,
    bonusB: 0,
    compensationA: 0,
    compensationB: 0,
    pointsA: 0,
    pointsB: 0,
  };
  const fail = (status: ScoreStatus): MatchEvaluation => ({ ...base, status, message: MESSAGES[status] });

  if (!input.set1 && !input.set2 && !input.stb) return fail('EMPTY');

  const scoreValid =
    o1 !== 'invalid' &&
    o2 !== 'invalid' &&
    o3 !== 'invalid' &&
    input.set1 !== null &&
    // il 2° set esiste solo dopo un 1° set chiuso
    (input.set2 === null || decided(o1)) &&
    // il super tie break esiste solo con set divisi
    (input.stb === null || (decided(o1) && decided(o2) && o1 !== o2));
  if (!scoreValid) return fail('INVALID_SCORE');

  let winner: Side | null = null;
  if (decided(o1) && decided(o2)) {
    if (o1 === o2) winner = o1;
    else if (decided(o3)) winner = o3;
  }

  if (input.timeExpired) {
    if (winner) return fail('WINNER_ON_TIMEOUT');
    return { ...base, status: 'OK', message: MESSAGES.OK, how: 'TIME_EXPIRED', pointsA: gamesA, pointsB: gamesB };
  }
  if (!winner) return fail('INCOMPLETE');

  const atStb = o1 !== o2;
  const compensationA = atStb && winner === 'A' ? Math.max(0, gamesB - gamesA) : 0;
  const compensationB = atStb && winner === 'B' ? Math.max(0, gamesA - gamesB) : 0;
  const bonusA = winner === 'A' ? 3 : 0;
  const bonusB = winner === 'B' ? 3 : 0;

  return {
    ...base,
    status: 'OK',
    message: MESSAGES.OK,
    winner,
    how: atStb ? 'SUPER_TIEBREAK' : 'TWO_SETS',
    bonusA,
    bonusB,
    compensationA,
    compensationB,
    pointsA: gamesA + bonusA + compensationA,
    pointsB: gamesB + bonusB + compensationB,
  };
}

/** "6-2 6-2" oppure "2-6 6-4 10-5" */
export function formatScore(input: MatchScoreInput): string {
  return [input.set1, input.set2, input.stb]
    .filter((s): s is GameScore => s !== null)
    .map((s) => `${s.a}-${s.b}`)
    .join(' ');
}
