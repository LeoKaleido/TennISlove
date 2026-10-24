// Logica comune ai form di inserimento risultato (app giocatore e gestionale).

import { evaluateMatch, setOutcome, type MatchEvaluation, type MatchScoreInput } from '@tentennis/shared';

export type Pair = [number, number];

export interface ScoreForm {
  set1: Pair;
  set2: Pair;
  stb: Pair;
  timeExpired: boolean;
}

export interface ScoreFormState {
  input: MatchScoreInput;
  ev: MatchEvaluation;
  /** set 1-1: serve il super tie break */
  split: boolean;
  feedback: { text: string; tone: 'ok' | 'warn' | 'err' };
}

/** Dai contatori allo score: i set non iniziati restano vuoti */
export function evaluateForm(f: ScoreForm, names: [string, string]): ScoreFormState {
  const o1 = setOutcome({ a: f.set1[0], b: f.set1[1] });
  const o2 = setOutcome({ a: f.set2[0], b: f.set2[1] });
  const set1Closed = o1 === 'A' || o1 === 'B';
  const set2Started = f.set2[0] + f.set2[1] > 0;
  const split = set1Closed && (o2 === 'A' || o2 === 'B') && o1 !== o2;
  const input: MatchScoreInput = {
    timeExpired: f.timeExpired,
    set1: { a: f.set1[0], b: f.set1[1] },
    set2: set1Closed || set2Started ? { a: f.set2[0], b: f.set2[1] } : null,
    stb: split && (!f.timeExpired || f.stb[0] + f.stb[1] > 0) ? { a: f.stb[0], b: f.stb[1] } : null,
  };
  const ev = evaluateMatch(input);
  const empty = f.set1[0] + f.set1[1] === 0;

  let feedback: ScoreFormState['feedback'];
  if (empty)
    feedback = {
      tone: 'warn',
      text: f.timeExpired ? 'Inserisci i game giocati prima dello scadere delle 2 ore.' : 'Inserisci i game dei due set.',
    };
  else if (ev.status === 'INVALID_SCORE')
    feedback = {
      tone: 'err',
      text:
        !set1Closed && set2Started
          ? 'Il 2° set può iniziare solo dopo un 1° set chiuso (6-4, 7-5, 7-6…).'
          : 'Controlla il punteggio: un set si chiude 6-0…6-4, 7-5 o 7-6; il super tie break a 10 con 2 punti di scarto.',
    };
  else if (ev.status === 'INCOMPLETE')
    feedback = {
      tone: 'warn',
      text: split ? 'Set pari: inserisci il super tie break a 10.' : 'Partita non finita: completa i set oppure spunta "Tempo scaduto".',
    };
  else if (ev.status === 'WINNER_ON_TIMEOUT') feedback = { tone: 'err', text: 'C\'è già un vincitore: togli "Tempo scaduto".' };
  else if (ev.how === 'TIME_EXPIRED')
    feedback = { tone: 'ok', text: 'Tempo scaduto: nessun vincitore, ognuno prende solo i game vinti.' };
  else {
    const w = ev.winner === 'A' ? names[0] : names[1];
    const subject = w === 'Tu' ? 'Vinci' : `${w} vince`;
    const comp = ev.compensationA || ev.compensationB;
    feedback = {
      tone: 'ok',
      text:
        ev.how === 'TWO_SETS'
          ? `${subject} in due set: game + 3.`
          : `${subject} al super tie break: game + 2 + 1${comp ? ` + ${comp} di compensazione` : ''}.`,
    };
  }
  return { input, ev, split, feedback };
}

export function formFromResult(r: Partial<MatchScoreInput> | null | undefined): ScoreForm {
  const pair = (s: { a: number; b: number } | null | undefined): Pair => (s ? [s.a, s.b] : [0, 0]);
  return { set1: pair(r?.set1), set2: pair(r?.set2), stb: pair(r?.stb), timeExpired: r?.timeExpired ?? false };
}
