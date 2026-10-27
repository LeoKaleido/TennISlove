import { describe, expect, it } from 'vitest';
import { computePredictionStandings, predictionsOpen, scorePredictions, type PredictionPick } from '../src/predictions';
import type { MatchScoreInput } from '../src/scoring';

const twoSets: MatchScoreInput = { timeExpired: false, set1: { a: 6, b: 3 }, set2: { a: 6, b: 4 }, stb: null };
const atStb: MatchScoreInput = { timeExpired: false, set1: { a: 3, b: 6 }, set2: { a: 6, b: 4 }, stb: { a: 10, b: 7 } };
const expired: MatchScoreInput = { timeExpired: true, set1: { a: 6, b: 3 }, set2: { a: 3, b: 4 }, stb: null };

const pick = (playerId: string, side: 'A' | 'B', how: PredictionPick['how'] = null): PredictionPick => ({ playerId, pick: side, how });
const points = (picks: PredictionPick[], score: MatchScoreInput) =>
  Object.fromEntries((scorePredictions(picks, score) ?? []).map((s) => [s.playerId, s.points]));

describe('scorePredictions', () => {
  it('2 punti per il vincitore, +1 per il modo solo se il vincitore è giusto', () => {
    const picks = [pick('p1', 'A'), pick('p2', 'A', 'TWO_SETS'), pick('p3', 'A', 'SUPER_TIEBREAK'), pick('p4', 'B', 'TWO_SETS')];
    expect(points(picks, twoSets)).toEqual({ p1: 2, p2: 3, p3: 2, p4: 0 });
  });

  it('modo giusto al super tie break', () => {
    expect(points([pick('p1', 'A', 'SUPER_TIEBREAK'), pick('p2', 'A', 'TWO_SETS'), pick('p3', 'A')], atStb)).toEqual({ p1: 3, p2: 2, p3: 2 });
  });

  it('colpo grosso: +2 se il vincitore giusto l\'ha scelto al massimo 1 su 4', () => {
    const picks = [pick('p1', 'A', 'TWO_SETS'), pick('p2', 'B'), pick('p3', 'B'), pick('p4', 'B')];
    const scores = scorePredictions(picks, twoSets)!;
    expect(scores.find((s) => s.playerId === 'p1')).toMatchObject({ points: 5, upset: true });
    expect(scores.filter((s) => s.upset)).toHaveLength(1);
  });

  it('niente colpo grosso sopra 1 su 4', () => {
    const picks = [pick('p1', 'A'), pick('p2', 'B'), pick('p3', 'B')];
    expect(points(picks, twoSets)).toEqual({ p1: 2, p2: 0, p3: 0 });
  });

  it('annullato con tempo scaduto senza vincitore o senza risultato', () => {
    expect(scorePredictions([pick('p1', 'A')], expired)).toBeNull();
    expect(scorePredictions([pick('p1', 'A')], null)).toBeNull();
  });
});

describe('predictionsOpen', () => {
  const now = new Date('2026-10-27T10:00:00Z');
  it('aperti fino all\'ora della partita, poi chiusi', () => {
    expect(predictionsOpen({ scheduledAt: '2026-10-27T18:00:00Z', hasResult: false }, now)).toBe(true);
    expect(predictionsOpen({ scheduledAt: '2026-10-27T09:00:00Z', hasResult: false }, now)).toBe(false);
  });
  it('senza programma restano aperti finché non c\'è un risultato', () => {
    expect(predictionsOpen({ scheduledAt: null, hasResult: false }, now)).toBe(true);
    expect(predictionsOpen({ scheduledAt: null, hasResult: true }, now)).toBe(false);
  });
});

describe('computePredictionStandings', () => {
  it('ordina per punti e poi per vincitori indovinati, a pari merito stessa posizione', () => {
    const rows = computePredictionStandings(
      ['p1', 'p2', 'p3', 'p4'],
      [
        { picks: [pick('p1', 'A', 'TWO_SETS'), pick('p2', 'A'), pick('p3', 'B')], score: twoSets },
        { picks: [pick('p2', 'A'), pick('p3', 'A')], score: atStb },
        { picks: [pick('p1', 'A')], score: null },
      ],
    );
    expect(rows.map((r) => [r.playerId, r.position, r.points, r.played, r.correct])).toEqual([
      ['p2', 1, 4, 2, 2],
      ['p1', 2, 3, 1, 1],
      ['p3', 3, 2, 2, 1],
      ['p4', 4, 0, 0, 0],
    ]);
  });
});
