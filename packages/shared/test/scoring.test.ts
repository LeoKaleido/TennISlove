import { describe, expect, it } from 'vitest';
import { evaluateMatch, setOutcome, stbOutcome, type MatchScoreInput } from '../src/scoring';

const m = (
  set1: [number, number] | null,
  set2: [number, number] | null = null,
  stb: [number, number] | null = null,
  timeExpired = false,
): MatchScoreInput => ({
  timeExpired,
  set1: set1 && { a: set1[0], b: set1[1] },
  set2: set2 && { a: set2[0], b: set2[1] },
  stb: stb && { a: stb[0], b: stb[1] },
});

describe('setOutcome', () => {
  it.each([
    [[6, 0], 'A'],
    [[6, 4], 'A'],
    [[7, 5], 'A'],
    [[7, 6], 'A'],
    [[4, 6], 'B'],
    [[6, 7], 'B'],
    [[5, 5], 'open'],
    [[6, 5], 'open'],
    [[6, 6], 'open'],
    [[3, 1], 'open'],
    [[7, 3], 'invalid'],
    [[7, 7], 'invalid'],
    [[8, 6], 'invalid'],
    [[-1, 6], 'invalid'],
    [[2.5, 6], 'invalid'],
  ])('%j → %s', ([a, b], expected) => {
    expect(setOutcome({ a: a!, b: b! })).toBe(expected);
  });
});

describe('stbOutcome', () => {
  it.each([
    [[10, 8], 'A'],
    [[10, 0], 'A'],
    [[9, 11], 'B'],
    [[12, 10], 'A'],
    [[10, 9], 'open'],
    [[7, 4], 'open'],
    [[13, 9], 'invalid'],
    [[11, 7], 'invalid'],
  ])('%j → %s', ([a, b], expected) => {
    expect(stbOutcome({ a: a!, b: b! })).toBe(expected);
  });
});

describe('evaluateMatch: punti', () => {
  it('vittoria in due set: game + 3', () => {
    const ev = evaluateMatch(m([6, 2], [6, 2]));
    expect(ev).toMatchObject({ status: 'OK', winner: 'A', how: 'TWO_SETS', pointsA: 15, pointsB: 4 });
  });

  it('esempio del regolamento: 0-6 6-4 10-8 → 13 a 10', () => {
    const ev = evaluateMatch(m([0, 6], [6, 4], [10, 8]));
    expect(ev).toMatchObject({ winner: 'A', how: 'SUPER_TIEBREAK', compensationA: 4, pointsA: 13, pointsB: 10 });
  });

  it('G01-05 Francesco-Leonardo 2-6 6-4 10-5 → 13 a 10', () => {
    expect(evaluateMatch(m([2, 6], [6, 4], [10, 5]))).toMatchObject({ pointsA: 13, pointsB: 10, compensationA: 2 });
  });

  it('G02-05 Alessandro P-Alessio 4-6 6-3 9-11 → 10 a 13', () => {
    expect(evaluateMatch(m([4, 6], [6, 3], [9, 11]))).toMatchObject({ winner: 'B', pointsA: 10, pointsB: 13, compensationB: 1 });
  });

  it('vittoria al STB con più game: nessuna compensazione', () => {
    expect(evaluateMatch(m([6, 0], [4, 6], [10, 3]))).toMatchObject({ compensationA: 0, pointsA: 13, pointsB: 6 });
  });

  it('chi vince al terzo ha sempre almeno 3 punti in più', () => {
    const ev = evaluateMatch(m([0, 6], [7, 6], [10, 1]));
    expect(ev.pointsA - ev.pointsB).toBeGreaterThanOrEqual(3);
  });

  it('i punti del super tie break non sono game', () => {
    const ev = evaluateMatch(m([0, 6], [6, 4], [10, 8]));
    expect(ev.gamesA).toBe(6);
    expect(ev.gamesB).toBe(10);
  });

  it('tempo scaduto: solo game, anche con set in corso', () => {
    expect(evaluateMatch(m([6, 3], [4, 2], null, true))).toMatchObject({
      status: 'OK',
      winner: null,
      how: 'TIME_EXPIRED',
      pointsA: 10,
      pointsB: 5,
    });
  });

  it('tempo scaduto durante il super tie break', () => {
    expect(evaluateMatch(m([6, 3], [4, 6], [7, 5], true))).toMatchObject({ status: 'OK', pointsA: 10, pointsB: 9 });
  });
});

describe('evaluateMatch: validazione', () => {
  it('niente inserito → Da giocare', () => {
    expect(evaluateMatch(m(null)).status).toBe('EMPTY');
  });
  it('set impossibile', () => {
    expect(evaluateMatch(m([7, 3], [6, 2])).status).toBe('INVALID_SCORE');
  });
  it('2° set senza 1° set chiuso', () => {
    expect(evaluateMatch(m([5, 4], [2, 1], null, true)).status).toBe('INVALID_SCORE');
  });
  it('super tie break con un giocatore che ha vinto entrambi i set', () => {
    expect(evaluateMatch(m([6, 2], [6, 2], [10, 5])).status).toBe('INVALID_SCORE');
  });
  it('concluso ma senza vincitore', () => {
    expect(evaluateMatch(m([6, 2], [4, 6])).status).toBe('INCOMPLETE');
    expect(evaluateMatch(m([6, 2], [3, 2])).status).toBe('INCOMPLETE');
  });
  it('tempo scaduto con vincitore già definito', () => {
    expect(evaluateMatch(m([6, 2], [6, 2], null, true)).status).toBe('WINNER_ON_TIMEOUT');
  });
});
